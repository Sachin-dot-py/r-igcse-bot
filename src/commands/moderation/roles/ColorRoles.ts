import { GuildPreferences } from "@/mongo";
import { ColorRole } from "@/mongo/schemas/ColorRole";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class ColorRolesCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("color_roles")
				.setDescription("Modify color roles (for mods)")
				.addSubcommand((subcommand) =>
					subcommand
						.setName("add")
						.setDescription("Add a color role")
						.addStringOption((option) =>
							option
								.setName("emoji")
								.setDescription("The emoji to use")
								.setRequired(false)
						)
						.addStringOption((option) =>
							option
								.setName("label")
								.setDescription("The label to use")
								.setRequired(true)
						)
						.addRoleOption((option) =>
							option
								.setName("role")
								.setDescription("The role to add")
								.setRequired(true)
						)
						.addRoleOption((option) =>
							option
								.setName("required_role")
								.setDescription(
									"The role required to access this color role"
								)
								.setRequired(false)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("remove")
						.setDescription("Remove a color role")
						.addStringOption((option) =>
							option
								.setName("label")
								.setDescription(
									"The label of the color role to remove"
								)
								.setRequired(true)
						)
				)
				.setDMPermission(false)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		switch (interaction.options.getSubcommand()) {
			case "add": {
				const emoji = interaction.options.getString("emoji", false);
				const label = interaction.options.getString("label", true);
				const role = interaction.options.getRole("role", true);
				const requiredRole = interaction.options.getRole(
					"required_role",
					false
				);

				await ColorRole.create({
					guildId: interaction.guildId,
					emoji,
					label,
					roleId: role.id,
					requirementRoleId: requiredRole?.id
				});

				break;
			}
			case "remove": {
				const label = interaction.options.getString("label", true);

				await GuildPreferences.deleteOne({
					guildId: interaction.guildId,
					label
				});

				break;
			}
			default:
				break;
		}
	}
}
