import { HOTM } from "@/mongo";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class HOTMResetVotesCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("reset_hotm")
				.setDescription(
					"You do not have the necessary permissions to perform this action",
				)
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ManageGuild | PermissionFlagsBits.ManageRoles,
				)
				.setDMPermission(false),
		);
	}

	async execute(
		interaction: DiscordChatInputCommandInteraction,
		client: DiscordClient,
	) {
		if (!interaction.guild) return;

		await HOTM.deleteMany({ guildId: interaction.guild.id });

		await interaction.reply({
			content: "Votes have been reset",
			ephemeral: true,
		});
	}
}
