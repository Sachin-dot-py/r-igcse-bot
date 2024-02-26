import { GuildPreferences, HOTM } from "@/mongo";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
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
						.setRequired(true),
				)
				.setDMPermission(false),
		);
	}

	async execute(interaction: DiscordChatInputCommandInteraction) {
		if (!interaction.guild) return;

		const helper = interaction.options.getUser("helper", true);

		// TODO: Implement Cache
		const igHelperRoleId = (
			await GuildPreferences.findOne({ guildId: interaction.guild.id })
		)?.igHelperRoleId;

		if (!igHelperRoleId) return;

		const helperRoles = interaction.guild.roles.cache.filter(
			(role) => igHelperRoleId === role.id,
		);

		if (!(helperRoles.size < 1)) {
			await interaction.reply({
				content: "Helper role not found",
				ephemeral: true,
			});
			// TODO: Logging for staff
			return;
		}

		if (!helperRoles.some((role) => role.members.has(helper.id))) {
			await interaction.reply({
				content: `${helper.displayName} is not a helper`,
				ephemeral: true,
			});
			return;
		}

		const hotm = await HOTM.updateOne(
			{ guildId: interaction.guild.id, helperId: helper.id },
			{ $addToSet: { voters: interaction.user.id } },
			{ upsert: true },
		).exec();

		if (hotm.modifiedCount < 1) {
			await interaction.reply({
				content: `You already voted for ${helper.displayName}`,
				ephemeral: true,
			});
			return;
		}

		await interaction.reply({
			content: `You voted for ${helper.displayName}`,
			ephemeral: true,
		});
	}
}
