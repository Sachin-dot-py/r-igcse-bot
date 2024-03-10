import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { SlashCommandBuilder } from "discord.js";

export default class ColorRolesCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("color_roles")
				.setDescription(
					"Choose a display colour for your name (for 100+ rep club)",
				)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const guildPrefs = await GuildPreferencesCache.get(interaction.guildId);

		const colorRolesRoleId = guildPrefs.colorRolesRoleId;
		const colorRolesRole = interaction.guild.roles.cache.get(colorRolesRoleId);

		if (!colorRolesRole) {
			interaction.reply({
				content: "Color roles role not found",
				ephemeral: true,
			});

			return;
		}

		if (!interaction.member.roles.cache.has(colorRolesRoleId)) {
			interaction.reply({
				content: "You do not meet the critera for this feature",
				ephemeral: true,
			});

			return;
		}

		// TODO: multiguild implementation
	}
}
