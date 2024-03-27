import { HOTM, HOTMUser, GuildPreferences } from "@/mongo";
import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import { APIEmbedField, EmbedBuilder, SlashCommandBuilder, TextChannel } from "discord.js";

export default class HOTMVotingCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("vote_hotm")
				.setDescription("Vote for the helper of the month")
				.addUserOption((option) =>
					option
						.setName("helper")
						.setDescription("Choose the helper to vote for")
						.setRequired(true)
				)
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId
		);

		if (!guildPreferences || !guildPreferences.hotmResultsChannelId || !guildPreferences.hotmEndTime) {
			interaction.reply({
				content: "This feature hasn't been configured.",
				ephemeral: true
			});

			return;
		}

		if (Date.now() >= guildPreferences.hotmEndTime) {
			interaction.reply({
				content: "HOTM voting has either ended or not begun yet.",
				ephemeral: true
			})
			return;
		}

		const helper = interaction.options.getUser("helper", true);

		const studyChannels = await StudyChannel.find({
			guildId: interaction.guild.id
		});

		if (studyChannels.length < 1) {
			interaction.reply({
				content: "This feature hasn't been configured.",
				ephemeral: true
			});

			return;
		}

		const hotmUser =
			(await HOTMUser.findOne({
				guildId: interaction.guild.id,
				userId: interaction.user.id
			})) ??
			(await HOTMUser.create({
				guildId: interaction.guild.id,
				userId: interaction.user.id
			}));

		if (hotmUser.voted.length >= 3) {
			interaction.reply({
				content: "You don't have any votes left",
				ephemeral: true
			});

			return;
		}

		if (hotmUser.voted.includes(helper.id)) {
			interaction.reply({
				content: "You have already voted for this helper",
				ephemeral: true
			});

			return;
		}

		const helperRoles = interaction.guild.roles.cache.filter((role) =>
			studyChannels
				.map((studyChannel) => studyChannel.helperRoleId)
				.some((helperRoleId) => helperRoleId === role.id)
		);

		if (helperRoles.size < 1) {
			interaction.reply({
				content: "Helper roles not found",
				ephemeral: true
			});

			return;
		}

		if (!helperRoles.some((role) => role.members.has(helper.id))) {
			interaction.reply({
				content: `${helper.tag} is not a helper`,
				ephemeral: true
			});

			return;
		}

		const helperDoc = await HOTM.findOne({
			guildId: interaction.guildId,
			helperId: helper.id
		});

		const helperVotes = (helperDoc?.votes ?? 0) + 1;

		await HOTM.updateOne(
			{ guildId: interaction.guild.id, helperId: helper.id },
			{
				$set: {
					votes: helperVotes
				}
			},
			{
				upsert: true
			}
		);

		await HOTMUser.updateOne(
			{ guildId: interaction.guild.id, userId: interaction.user.id },
			{
				$push: {
					voted: helper.id
				}
			},
			{ upsert: true }
		);
		
		this.handleEmbed(interaction, guildPreferences.hotmResultsEmbedId, guildPreferences.hotmResultsChannelId)

		Logger.channel(
			interaction.guild,
			guildPreferences.hotmResultsChannelId,
			{
				content: `${interaction.user.tag} has voted for ${helper.tag} who now has ${helperVotes} votes.`
			}
		);

		interaction.reply({
			content: `You voted for ${helper.tag} and have ${3 - (hotmUser.voted.length + 1)} votes left.`,
			ephemeral: true
		});
	}

        private async handleEmbed(interaction: DiscordChatInputCommandInteraction<"cached">, messageId: string, channelId: string) {
		const resultsChannel = await interaction.guild.channels.cache.get(channelId);
		if (!resultsChannel || !(resultsChannel instanceof TextChannel)) return;
		let embedMessage = await resultsChannel.messages.fetch(messageId).catch(() => null)
		const results = await HOTM.find({ guildId: interaction.guild.id }).sort({ votes: -1 }).limit(20).exec();
		const fields: APIEmbedField[] = []
		for (const helper of results) {
			const user = await interaction.guild.members.fetch(helper.helperId).catch(() => null)
			fields.push({
				name: user ? `${user.user.tag} (${user.id})` : helper.helperId,
				value: `Votes: ${helper.votes}`
			})
		}
		const embed = new EmbedBuilder().setTitle("HOTM Results").setTimestamp().addFields(...fields)
		
		if (!messageId || !embedMessage) {
			embedMessage = await resultsChannel.send({
				embeds: [embed]
			})
			await GuildPreferences.updateOne({
				guildId: interaction.guild.id
			}, {
				hotmResultsEmbedId: embedMessage.id
			})
			return;
		}
		await embedMessage.edit({
			embeds: [embed]
		})
	}
}
