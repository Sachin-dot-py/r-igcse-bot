import { logger } from "@/index";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	ComponentType,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
} from "discord.js";

export default class ColorRolesCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("color")
				.setDescription("Choose a display colour for your name")
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

		// TODO: Allow server boosters to have this as a perk
		if (!interaction.member.roles.cache.has(colorRolesRoleId)) {
			interaction.reply({
				content: "You do not meet the critera for this feature",
				ephemeral: true,
			});

			return;
		}

		const colorRoles = guildPrefs.colorRoles;

		if (colorRoles.length < 1) {
			interaction.reply({
				content: "Color roles not configured for this server",
				ephemeral: true,
			});

			return;
		}

		const roleSelect = new StringSelectMenuBuilder()
			.setCustomId("color_roles")
			.setPlaceholder("Choose a color role")
			.setMinValues(0)
			.setMaxValues(1);

		for (const colorRole of colorRoles)
			roleSelect.addOptions({
				emoji: colorRole.emoji,
				label: colorRole.label,
				value: colorRole.id,
			});

		const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			roleSelect,
		);

		const component = await interaction.reply({
			components: [row],
			ephemeral: true,
		});

		component
			.awaitMessageComponent({
				filter: (i) => i.user.id === interaction.user.id,
				time: 120000,
				componentType: ComponentType.StringSelect,
			})
			.then((i: StringSelectMenuInteraction<"cached">) => {
				i.deferUpdate();

				const role = interaction.guild.roles.cache.get(i.values[0]);

				if (!role) {
					i.reply({
						content: "Roles not configured",
						ephemeral: true,
					});

					return;
				}

				i.member.roles.add(role);

				i.reply({
					content: `Added role ${role.name}`,
					ephemeral: true,
				});
			})
			.catch(logger.error);
	}
}
