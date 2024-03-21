import { ColorRole } from "@/mongo/schemas/ColorRole";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import {
	ActionRowBuilder,
	ComponentType,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder
} from "discord.js";

export default class ColorRolesCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("color")
				.setDescription("Choose a display colour for your name")
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const guildColorRoles = await ColorRole.find({
			guildId: interaction.guildId
		});

		if (guildColorRoles.length < 1) {
			await interaction.reply({
				content: "Color roles not configured for this server",
				ephemeral: true
			});

			return;
		}

		const colorRoles = guildColorRoles.filter(({ requirementRoleId }) =>
			requirementRoleId
				? interaction.member.roles.cache.has(requirementRoleId)
				: true
		);

		// TODO: Allow server boosters to have this as a perk
		if (colorRoles.length < 1) {
			await interaction.reply({
				content: "No color roles are available for you ¯\\_(ツ)_/¯",
				ephemeral: true
			});

			return;
		}

		const roleSelect = new StringSelectMenuBuilder()
			.setCustomId("color_roles")
			.setPlaceholder("Choose a color role")
			.setMinValues(0)
			.setMaxValues(1)
			.addOptions(
				colorRoles.map(({ label, roleId, emoji }) =>
					((x) => (emoji ? x.setEmoji(emoji) : x))(
						new StringSelectMenuOptionBuilder()
							.setLabel(label)
							.setValue(roleId)
					)
				)
			);

		const row =
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				roleSelect
			);

		const component = await interaction.reply({
			components: [row],
			ephemeral: true
		});

		component
			.awaitMessageComponent({
				filter: (i) =>
					i.user.id === interaction.user.id &&
					i.customId === "color_roles",
				time: 120000,
				componentType: ComponentType.StringSelect
			})
			.then(async (i: StringSelectMenuInteraction<"cached">) => {
				await i.deferUpdate();

				const role = interaction.guild.roles.cache.get(i.values[0]);

				if (!role) {
					interaction.followUp({
						content: "Role not configured",
						ephemeral: true
					});
				} else {
					await i.member.roles.remove(
						colorRoles.map((colorRole) => colorRole.roleId)
					);
					await i.member.roles.add(role);

					interaction.followUp({
						content: `Added role ${role.name}`,
						ephemeral: true
					});
				}
			})
			.catch(Logger.error);
	}
}
