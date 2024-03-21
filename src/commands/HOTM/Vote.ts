import { HOTM, HOTMUser } from "@/mongo";
import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import { SlashCommandBuilder } from "discord.js";

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
		const helper = interaction.options.getUser("helper", true);

		const studyChannels = await StudyChannel.find({
			guildId: interaction.guild.id
		});

		if (studyChannels.length < 1) {
			await interaction.reply({
				content: "This feature hasn't been configured.",
				ephemeral: true
			});

			return;
		}

		const userVotes = await HOTMUser.findOne({
			guildId: interaction.guild.id,
			userId: interaction.user.id
		});

		if (userVotes?.votesLeft === 0) {
			await interaction.reply({
				content: "You don't have any votes left",
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
			await interaction.reply({
				content: "Helper roles not found",
				ephemeral: true
			});

			return;
		}

		if (!helperRoles.some((role) => role.members.has(helper.id))) {
			await interaction.reply({
				content: `${helper.tag} is not a helper`,
				ephemeral: true
			});
			return;
		}

		const helperExists = await HOTM.findOne({
			guildId: interaction.guild.id,
			helperId: helper.id
		});

		await HOTM.updateOne(
			{ guildId: interaction.guild.id, helperId: helper.id },
			{
				$set: {
					votes: (helperExists?.votes ?? 0) + 1
				},
				$setOnInsert: {
					guildId: interaction.guild.id,
					helperId: helper.id
				}
			},
			{
				upsert: true
			}
		);

		const userExists = await HOTMUser.findOne({
			guildId: interaction.guild.id,
			userId: interaction.user.id
		});

		await HOTMUser.updateOne(
			{ guildId: interaction.guild.id, userId: interaction.user.id },
			{
				$set: {
					votesLeft: (userExists?.votesLeft ?? 3) - 1
				},
				$setOnInsert: {
					guildId: interaction.guild.id,
					userId: interaction.user.id
				}
			},
			{ upsert: true }
		);

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId
		);

		if (guildPreferences?.hotmResultsChannelId) {
			await Logger.channel(
				interaction.guild,
				guildPreferences.hotmResultsChannelId,
				{
					content: `${interaction.user} (${interaction.user.tag}) has voted for ${helper} (${helper.tag}) who now has ${(helperExists?.votes ?? 0) + 1} votes.`
				}
			);
		}

		await interaction.reply({
			content: `You voted for ${helper.tag} and have ${(userExists?.votesLeft ?? 3) - 1} votes left.`,
			ephemeral: true
		});
	}
}
