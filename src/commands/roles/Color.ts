import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
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
		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);

		if (!guildPreferences) {
			await interaction.reply({
				content:
					"Please setup the bot using the command `/set_preferences` first.",
				ephemeral: true,
			});
			return;
		}

		const colorRolesData = guildPreferences.colorRoles;

		if (!colorRolesData) {
			await interaction.reply({
				content: "Color roles not configured for this server",
				ephemeral: true,
			});

			return;
		}

		const colorRoles = colorRolesData.filter(({ requirementRoleId }) =>
			interaction.member.roles.cache.has(requirementRoleId),
		);

		// TODO: Allow server boosters to have this as a perk
		if (colorRoles.length < 1) {
			await interaction.reply({
				content: "No color roles are available for you ¯\\_(ツ)_/¯",
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
				value: colorRole.roleId,
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
						content: "Role not configured",
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
			.catch(Logger.error);
	}
}
