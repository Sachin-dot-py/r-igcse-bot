import { ColorRole } from "@/mongo/schemas/ColorRole";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	ComponentType,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
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
		const guildColorRoles = await ColorRole.find({
			guildId: interaction.guildId,
		});

		if (guildColorRoles.length < 1) {
			await interaction.reply({
				content: "Color roles not configured for this server",
				ephemeral: true,
			});

			return;
		}

		const colorRoles = guildColorRoles.filter(({ requirementRoleIds }) =>
			requirementRoleIds
				? requirementRoleIds.some((roleId) =>
						interaction.member.roles.cache.has(roleId),
					)
				: true,
		);

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
			.setMaxValues(1)
			.addOptions(
				colorRoles.map(({ label, roleId, emoji }) =>
					((x) => (emoji ? x.setEmoji(emoji) : x))(
						new StringSelectMenuOptionBuilder()
							.setLabel(label)
							.setValue(roleId),
					),
				),
			);

		const row =
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				roleSelect,
			);

		const component = await interaction.reply({
			components: [row],
			ephemeral: true,
		});

		const collector = component.createMessageComponentCollector({
			filter: (i) =>
				i.user.id === interaction.user.id &&
				i.customId === "color_roles",
			componentType: ComponentType.StringSelect,
			time: 300_000,
		});

		collector.on("collect", async (i) => {
			await i.deferUpdate();

			const role = interaction.guild.roles.cache.get(i.values[0]);

			if (role) {
				if (i.member.roles.cache.has(role.id)) {
					await i.member.roles.remove(role);
					interaction.followUp({
						content: `Removed role ${role.name}`,
						ephemeral: true,
					});
					return;
				}
				await i.member.roles
					.remove(
						guildColorRoles.map((colorRole) => colorRole.roleId),
					)
					.catch(() => {});
				await i.member.roles.add(role);

				interaction.followUp({
					content: `Added role ${role.name}`,
					ephemeral: true,
				});
			} else {
				await i.member.roles
					.remove(
						guildColorRoles.map((colorRole) => colorRole.roleId),
					)
					.catch(() => {});
				interaction.followUp({
					content: "All color roles have been removed from you.",
					ephemeral: true,
				});
			}
		});
	}
}
