import { GuildPreferences } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

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
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("label")
								.setDescription("The label to use")
								.setRequired(true),
						)
						.addRoleOption((option) =>
							option
								.setName("role")
								.setDescription("The role to add")
								.setRequired(true),
						)
						.addRoleOption((option) =>
							option
								.setName("required_role")
								.setDescription("The role required to access this color role")
								.setRequired(true),
						),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("remove")
						.setDescription("Remove a color role")
						.addStringOption((option) =>
							option
								.setName("label")
								.setDescription("The label of the color role to remove")
								.setRequired(true),
						),
				)
				.setDMPermission(false)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
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
				content: "Please setup the bot using the command `/set_preferences` first.",
				ephemeral: true,
			});
			return;
		}

		switch (interaction.options.getSubcommand()) {
			case "add": {
				const emoji = interaction.options.getString("emoji", true);
				const label = interaction.options.getString("label", true);
				const role = interaction.options.getRole("role", true);
				const requiredRole = interaction.options.getRole("required_role", true);

				const colorRole = {
					emoji,
					label,
					roleId: role.id,
					requirementRoleId: requiredRole.id,
				};

				guildPreferences.colorRoles.push(colorRole);

				await GuildPreferencesCache.save(guildPreferences);

				await GuildPreferences.updateOne(
					{
						guildId: interaction.guildId,
					},
					{
						$push: {
							colorRoles: colorRole,
						},
					},
				);

				break;
			}
			case "remove": {
				const label = interaction.options.getString("label", true);

				try {
					for (const [i, colorRole] of guildPreferences.colorRoles.entries())
						if (colorRole.label === label) guildPreferences.colorRoles[i];

					await GuildPreferencesCache.save(guildPreferences);

					await GuildPreferences.updateOne(
						{
							guildId: interaction.guildId,
						},
						{
							$pullAll: {
								colorRoles: [{ label }],
							},
						},
					);
				} catch (error) {
					await interaction.reply({
						content: "Error occured while removing color role",
						ephemeral: true,
					});

					Logger.errorLog(client, error as Error, "Removing color role", interaction.user.id)
				}

				break;
			}
			default:
				break;
		}
	}
}
