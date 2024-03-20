import { HOTM, HOTMUser } from "@/mongo";
import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
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
				content: "This feature hasn't been configured."
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

		await HOTM.updateOne(
			{ guildId: interaction.guild.id, helperId: helper.id },
			{ $inc: { votes: 1 } },
			{ upsert: true }
		);

		await HOTMUser.updateOne(
			{ guildId: interaction.guild.id, userId: interaction.user.id },
			{ $inc: { votesLeft: -1 } },
			{ upsert: true }
		);

		await interaction.reply({
			content: `You voted for ${helper.tag} and have ${(userVotes?.votesLeft ?? 3) - 1} votes left.`,
			ephemeral: true
		});
	}
}
