import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class SetGuildPreferenceCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("set_preferences")
				.setDescription("Set server preferences (for mods)")
				.addBooleanOption((option) =>
					option
						.setName("rep_enabled")
						.setDescription("Enable reputation system"),
				)
				.addChannelOption((option) =>
					option
						.setName("modlog_channel")
						.setDescription("Channel to log moderation actions"),
				)
				.addChannelOption((option) =>
					option
						.setName("botlog_channel")
						.setDescription("Channel to log bot errors"),
				)
				.addChannelOption((option) =>
					option
						.setName("welcome_channel")
						.setDescription("Channel to welcome new members"),
				),
			// .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
			// .setDMPermission(false),
		);
	}

	async execute(interaction: DiscordChatInputCommandInteraction) {
		const repEnabled = 0;
	}
}
