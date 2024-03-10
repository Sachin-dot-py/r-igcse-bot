import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class rrMakeCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("rrmake")
				.setDescription("Create reaction roles")
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ManageMessages | PermissionFlagsBits.ManageRoles,
				)
				.setDMPermission(false),
		);
	}

	// TODO: Reaction Roles Command
	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {}
}
