import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class KeywordCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("keyword")
				.setDescription("Create / Delete keywords for a server")
				.addSubcommand((command) =>
					command.setName("add").setDescription("Add a keyword")
				)
				.addSubcommand((command) =>
					command.setName("remove").setDescription("Remove a keyword")
				)
				.setDMPermission(false)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		if (interaction.options.getSubcommand() === "add") {
			// TODO: Add keyword
		} else if (interaction.options.getSubcommand() === "remove") {
			// TODO: Remove keyword
		}
	}
}
