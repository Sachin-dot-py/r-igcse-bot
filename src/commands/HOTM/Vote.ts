import { HOTM, HOTMUser, GuildPreferences } from "@/mongo";
import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import { SlashCommandBuilder } from "discord.js";
import HOTMSessionCommand from "./VotingSession";

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

		if (!guildPreferences || !guildPreferences.hotmResultsChannelId) {
			interaction.reply({
				content: "This feature hasn't been configured.",
				ephemeral: true
			});

			return;
		}
		if (!guildPreferences.hotmSessionOngoing) {
			await interaction.reply({
				content:
					"The voting period has not started yet or has already ended.",
				ephemeral: true
			});

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

		if (interaction.user.id === helper.id) {
			interaction.reply({
				content: "You cannot vote for yourself",
				ephemeral: true
			});

			return;
		}

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

		await interaction.deferReply({
			ephemeral: true
		});

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

		await Logger.channel(
			interaction.guild,
			guildPreferences.hotmResultsChannelId,
			{
				content: `${interaction.user.tag} has voted for ${helper.tag} who now has ${helperVotes} votes.`
			}
		);

		const newSessionCommand = client.commands.get("hotm_session") as
			| HOTMSessionCommand
			| undefined;

		const mongoGuildPreferences = await GuildPreferences.findOne({
			guildId: interaction.guild.id
		});

		await newSessionCommand?.handleEmbed(
			interaction.guild,
			mongoGuildPreferences?.hotmResultsEmbedId,
			guildPreferences.hotmResultsChannelId
		);

		interaction.editReply({
			content: `You voted for ${helper.tag} and have ${3 - (hotmUser.voted.length + 1)} votes left.`
		});
	}
}
