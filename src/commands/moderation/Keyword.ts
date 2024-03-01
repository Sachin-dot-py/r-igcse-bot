import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class KeywordCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("keyword")
				.setDMPermission(false)
				.addSubcommand((builder) =>
					builder.setName("add").setDescription("Add a keyword"),
				)
				.addSubcommand((builder) =>
					builder.setName("remove").setDescription("Remove a keyword"),
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
		);
	}

	async execute(interaction: DiscordChatInputCommandInteraction) {}
}
