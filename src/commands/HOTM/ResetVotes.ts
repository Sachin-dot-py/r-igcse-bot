import { HOTM } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class HOTMResetVotesCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("reset_hotm")
				.setDescription("// TODO")
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ManageGuild | PermissionFlagsBits.ManageRoles,
				)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		await HOTM.deleteMany({ guildId: interaction.guild.id });

		await interaction.reply({
			content: "Votes have been reset",
			ephemeral: true,
		});
	}
}
