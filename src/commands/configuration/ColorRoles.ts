import Buttons from "@/components/practice/views/Buttons";
import RoleSelect from "@/components/RoleSelect";
import { GuildPreferences } from "@/mongo";
import { ColorRole } from "@/mongo/schemas/ColorRole";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import { ActionRowBuilder, ButtonBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { v4 as uuidv4 } from "uuid";

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
						.addStringOption((option) =>
							option
								.setName("emoji")
								.setDescription("The emoji to use")
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

				const customId = uuidv4();

				const roleSelectMenu = new RoleSelect(
					"required_role_select",
					"Select the required roles for this color roles",
					25,
					`${customId}_0`,
					[]
				)

				const row = new ActionRowBuilder<RoleSelect>().addComponents(roleSelectMenu);

				const selectInteraction = await interaction.reply({
					content: "Select the required roles for this color role (click confirm to skip). User will need to have at least one of these roles to able to see this color role.",
					components: [
						row,
						new Buttons(customId) as ActionRowBuilder<ButtonBuilder>
					],
					ephemeral: true,
					fetchReply: true
				});

				const requiredRoles = await roleSelectMenu.waitForResponse(
					`${customId}_0`,
					selectInteraction,
					interaction,
					false
				);

				if (requiredRoles === "Timed out") return;

				await ColorRole.updateOne(
					{
						guildId: interaction.guildId,
						label,
						roleId: role.id
					},
					{
						requirementRoleIds: requiredRoles || null,
						emoji
					},
					{ upsert: true }
				);

				await interaction.editReply({
					content: "Successfully created color role!",
					components: []
				});

				break;
			}
			case "remove": {
				const label = interaction.options.getString("label", true);

				try {
					await GuildPreferences.deleteOne({
						guildId: interaction.guildId,
						label
					});
				} catch (error) {
					await interaction.reply({
						content:
							"Encountered error while trying to delete color role. Please try again later.",
						ephemeral: true
					});

					client.log(
						error,
						`${this.data.name} Command - Remove Color Role`,
						`**Channel:** <#${interaction.channel?.id}>
**User:** <@${interaction.user.id}>
**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`
					);
				}

				await interaction.reply({
					content: "Successfully deleted color role.",
					ephemeral: true
				});

				break;
			}
			default:
				break;
		}
	}
}
