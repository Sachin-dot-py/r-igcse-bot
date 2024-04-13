import { HOTM, HOTMUser, GuildPreferences, HOTMSession } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
	EmbedBuilder,
	Guild,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TextChannel,
	type APIEmbedField
} from "discord.js";

export default class HOTMSessionCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("hotm_session")
				.setDescription("Start, modify, or end an HOTM voting session")
				.addSubcommand((subcommand) =>
					subcommand
						.setName("start")
						.setDescription("Start a new voting session")
						.addNumberOption((option) =>
							option
								.setName("duration")
								.setDescription(
									"Duration of the voting session (days; number only)"
								)
								.setMinValue(1)
								.setRequired(true)
						)
						.addNumberOption((option) =>
							option
								.setName("start_time")
								.setDescription(
									"When the voting session will start (Epoch timestamp; default is right now)"
								)
								.setRequired(false)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("modify")
						.setDescription(
							"Modify an ongoing/future voting session"
						)
						.addNumberOption((option) =>
							option
								.setName("start_time")
								.setDescription(
									"Change when the voting session will start (Epoch timestamp)"
								)
								.setMinValue(0)
								.setRequired(false)
						)
						.addNumberOption((option) =>
							option
								.setName("duration")
								.setDescription(
									"Change how long the voting session will last (days)"
								)
								.setMinValue(1)
								.setRequired(false)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("end")
						.setDescription("End the current voting session")
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const session = await HOTMSession.findOne({
			guildId: interaction.guildId
		});

		const guildPreferences = await GuildPreferences.findOne({
			guildId: interaction.guildId
		});

		if (!guildPreferences) {
			interaction.reply({
				content:
					"Configure the bot using `/setup` before starting sessions",
				ephemeral: true
			});
			return;
		}

		switch (interaction.options.getSubcommand()) {
			case "start": {
				const startTime =
					interaction.options.getNumber("start_time", false) ??
					Math.floor(Date.now() / 1000); // epoch timestamp; defaults to right now
				const duration = interaction.options.getNumber(
					"duration",
					true
				);

				const startDate = new Date(startTime * 1000);
				const endDate = new Date(
					startDate.getTime() + duration * 24 * 60 * 60 * 1000
				);

				if (session) {
					interaction.reply({
						content:
							"A HOTM session is already ongoing, end it before starting a new one or modify the current one using `/hotm_session modify`",
						ephemeral: true
					});
					return;
				}

				await interaction.deferReply({
					ephemeral: true
				});

				await HOTMSession.create({
					guildId: interaction.guildId,
					startDate: startDate,
					endDate: endDate
				});

				interaction.editReply({
					content: `Starting a new voting session <t:${(startDate.getTime() / 1000).toFixed(0)}:R>, which will end <t:${(endDate.getTime() / 1000).toFixed(0)}:R>`
				});
				break;
			}

			case "modify": {
				if (!session) {
					interaction.reply({
						content:
							"There is currently no active voting session, start one using `/hotm_session start`",
						ephemeral: true
					});
					return;
				}

				await interaction.deferReply({
					ephemeral: true
				});

				const startTime = interaction.options.getNumber(
					"start_time",
					false
				);
				const duration = interaction.options.getNumber(
					"duration",
					false
				);

				const startDate = startTime
					? new Date(startTime * 1000)
					: session.startDate;

				if (startTime) {
					if (startDate.getTime() < Date.now()) {
						interaction.reply({
							content:
								"Can't set the start date to a time in the past, i ain't got no time machine",
							ephemeral: true
						});
						return;
					}

					await HOTMSession.updateOne(
						{ guildId: interaction.guildId },
						{ startDate: startDate }
					);

					return;
				}

				if (duration) {
					const endDate = new Date(
						startDate.getTime() + duration * 24 * 60 * 60 * 1000
					);

					if (endDate.getTime() <= Date.now()) {
						interaction.reply({
							content:
								"Can't set the end date to a time in the past, i ain't got no time machine",
							ephemeral: true
						});

						await HOTMSession.updateOne(
							{ guildId: interaction.guildId },
							{ endDate: endDate }
						);

						return;
					}
				}

				interaction.editReply({
					content: "Session modified successfully."
				});

				break;
			}

			case "end": {
				if (!session) {
					interaction.reply({
						content: "There is no voting session to end",
						ephemeral: true
					});
					return;
				}

				await interaction.deferReply({ ephemeral: true });

				await session.updateOne({ endDate: Date.now() });

				await this.endSession(client, interaction.guildId);

				interaction.editReply("Session ended");

				break;
			}
		}
	}

	async endSession(client: DiscordClient<true>, guildId?: string | null) {
		const sessions = guildId
			? await HOTMSession.find({
				guildId
			})
			: await HOTMSession.find({
				endDate: { $gte: Date.now() }
			});
		if (!sessions) return;

		for (const session of sessions) {
			const guildPreferences = await GuildPreferencesCache.get(
				session.guildId
			);

			if (!guildPreferences?.hotmResultsChannelId) return;

			this.handleEmbed(
				client.guilds.cache.get(session.guildId),
				guildPreferences.hotmResultsEmbedId,
				guildPreferences.hotmResultsChannelId,
				"HOTM session has ended."
			);

			await GuildPreferences.updateOne(
				{ guildId: session.guildId },
				{ hotmResultsEmbedId: null }
			);

			await session.deleteOne();
			await HOTM.deleteMany({ guildId: session.guildId });
			await HOTMUser.deleteMany({ guildId: session.guildId });
		}
	}

	async handleEmbed(
		guild: Guild | undefined,
		messageId: string | undefined,
		channelId: string,
		message: string | undefined = undefined
	) {
		if (!guild) return;
		const resultsChannel = guild.channels.cache.get(channelId);
		if (!resultsChannel || !(resultsChannel instanceof TextChannel)) return;

		const results = await HOTM.find({ guildId: guild.id })
			.sort({ votes: -1 })
			.limit(20)
			.exec();

		const fields: APIEmbedField[] = [];

		for (const helper of results) {
			const user = await guild.members
				.fetch(helper.helperId)
				.catch(() => null);
			fields.push({
				name: user ? `${user.user.tag} (${user.id})` : helper.helperId,
				value: `Votes: ${helper.votes}`
			});
		}
		const embed = new EmbedBuilder()
			.setDescription(message ?? null)
			.setTitle("HOTM Results")
			.setTimestamp()
			.addFields(...fields);

		if (messageId)
			resultsChannel.messages.delete(messageId).catch(() => { });

		const embedMessage = await resultsChannel.send({
			embeds: [embed]
		});
		await GuildPreferences.updateOne(
			{
				guildId: guild.id
			},
			{
				hotmResultsEmbedId: embedMessage.id
			}
		);
		return;
	}
}
