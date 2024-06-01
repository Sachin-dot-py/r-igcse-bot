import { HOTM, GuildPreferences, HOTMUser } from "@/mongo";
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
				.setDescription("Start or end an HOTM voting session")
				.addSubcommand((subcommand) =>
					subcommand
						.setName("start")
						.setDescription("Start a new voting session")
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
				if (guildPreferences.hotmSessionOngoing) {
					interaction.reply({
						content:
							"A HOTM session is already ongoing, end it before starting a new one",
						ephemeral: true
					});
					return;
				}

				await interaction.deferReply({
					ephemeral: true
				});

				await guildPreferences.updateOne({
					hotmSessionOngoing: true,
					hotmResultsEmbedId: null
				});
				await HOTM.deleteMany({ guildId: interaction.guildId });
				await HOTMUser.deleteMany({ guildId: interaction.guildId });

				interaction.editReply({
					content: `Started a new voting session`
				});
				break;
			}

			case "end": {
				if (!guildPreferences.hotmSessionOngoing) {
					interaction.reply({
						content: "There is no voting session to end",
						ephemeral: true
					});
					return;
				}

				await interaction.deferReply({ ephemeral: true });

				await guildPreferences.updateOne({ hotmSessionOngoing: false });

				if (!guildPreferences?.hotmResultsChannelId) return;

				this.handleEmbed(
					interaction.guild,
					guildPreferences.hotmResultsEmbedId,
					guildPreferences.hotmResultsChannelId,
					"HOTM session has ended."
				);

				await guildPreferences.updateOne({ hotmResultsEmbedId: null });
				await HOTM.deleteMany({ guildId: interaction.guildId });
				await HOTMUser.deleteMany({ guildId: interaction.guildId });

				interaction.editReply("Voting session ended");

				break;
			}
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
			resultsChannel.messages.delete(messageId).catch(() => {});

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
