import { GuildPreferences, HOTM, HOTMBlacklist, HOTMUser } from "@/mongo";
import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { logToChannel } from "@/utils/Logger";
import { SlashCommandBuilder } from "discord.js";
import type hotmSessionCommand from "./VotingSession";

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
						.setRequired(true),
				)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		await interaction.deferReply({
			ephemeral: true,
		});

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);

		if (!guildPreferences || !guildPreferences.hotmResultsChannelId) {
			interaction.editReply({
				content: "This feature hasn't been configured.",
			});

			return;
		}
		if (!guildPreferences.hotmSessionOngoing) {
			await interaction.editReply({
				content:
					"The voting period has not started yet or has already ended.",
			});

			return;
		}
		if (!guildPreferences.hotmSessionOngoing) {
			await interaction.reply({
				content:
					"The voting period has not started yet or has already ended.",
				ephemeral: true,
			});

			return;
		}

		const helper = interaction.options.getUser("helper", true);

		const studyChannels = await StudyChannel.find({
			guildId: interaction.guild.id,
		});

		if (studyChannels.length < 1) {
			interaction.editReply({
				content: "This feature hasn't been configured.",
			});

			return;
		}

		const hotmUser =
			(await HOTMUser.findOne({
				guildId: interaction.guild.id,
				userId: interaction.user.id,
			})) ??
			(await HOTMUser.create({
				guildId: interaction.guild.id,
				userId: interaction.user.id,
			}));

		if (interaction.user.id === helper.id) {
			interaction.editReply({
				content: "You cannot vote for yourself",
			});

			return;
		}

		if (hotmUser.voted.length >= 3) {
			interaction.editReply({
				content: "You don't have any votes left",
			});

			return;
		}

		if (hotmUser.voted.includes(helper.id)) {
			interaction.editReply({
				content: "You have already voted for this helper",
			});

			return;
		}

		const helperRoles = interaction.guild.roles.cache.filter((role) =>
			studyChannels
				.map((studyChannel) => studyChannel.helperRoleId)
				.some((helperRoleId) => helperRoleId === role.id),
		);

		if (helperRoles.size < 1) {
			interaction.editReply({
				content: "Helper roles not found",
			});

			return;
		}

		if (!helperRoles.some((role) => role.members.has(helper.id))) {
			interaction.editReply({
				content: `${helper.tag} is not a helper`,
			});

			return;
		}

		const hotmBlacklist = await HOTMBlacklist.findOne({
			guildId: interaction.guild.id,
			helperId: helper.id,
		});

		if (hotmBlacklist) {
			interaction.editReply({
				content: "This helper has been blacklisted from HOTM.",
			});

			return;
		}

		const helperDoc = await HOTM.findOne({
			guildId: interaction.guildId,
			helperId: helper.id,
		});

		const helperVotes = (helperDoc?.votes ?? 0) + 1;

		await HOTM.updateOne(
			{ guildId: interaction.guild.id, helperId: helper.id },
			{
				$set: {
					votes: helperVotes,
				},
			},
			{
				upsert: true,
			},
		);

		await HOTMUser.updateOne(
			{ guildId: interaction.guild.id, userId: interaction.user.id },
			{
				$push: {
					voted: helper.id,
				},
			},
			{ upsert: true },
		);

		await logToChannel(
			interaction.guild,
			guildPreferences.hotmResultsChannelId,
			{
				content: `${interaction.user.tag} has voted for ${helper.tag} who now has ${helperVotes} votes.`,
			},
		);

		const newSessionCommand = client.commands.get("hotm_session") as
			| hotmSessionCommand
			| undefined;

		const mongoGuildPreferences = await GuildPreferences.findOne({
			guildId: interaction.guild.id,
		});

		await newSessionCommand?.handleEmbed(
			interaction.guild,
			mongoGuildPreferences?.hotmResultsEmbedId,
			guildPreferences.hotmResultsChannelId,
		);

		interaction.editReply({
			content: `You voted for ${helper.tag} and have ${3 - (hotmUser.voted.length + 1)} votes left.`,
		});
	}
}
