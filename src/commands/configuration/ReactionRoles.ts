import { ReactionRole } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class ReactionRolesCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("reaction_roles")
				.setDescription("Create / Delete reaction roles (for mods)")
				.addSubcommand((subcommand) =>
					subcommand
						.setName("create")
						.setDescription("Create a reaction role")
						.addStringOption((option) =>
							option
								.setName("message_id")
								.setDescription(
									"The id of the message to add the reaction role to",
								)
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("emoji")
								.setDescription("The emoji to use")
								.setRequired(true),
						)
						.addRoleOption((option) =>
							option
								.setName("role")
								.setDescription("The role to add")
								.setRequired(true),
						),
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel) return;

		switch (interaction.options.getSubcommand()) {
			case "create": {
				const messageId = interaction.options.getString(
					"message_id",
					true,
				);
				const emoji = interaction.options.getString("emoji", true);
				const role = interaction.options.getRole("role", true);

				const message = interaction.channel.messages.fetch(messageId);

				if (!message) {
					await interaction.reply({
						content: "Message not found",
						flags: MessageFlags.Ephemeral
					});

					return;
				}

				try {
					await ReactionRole.create({
						messageId,
						emoji,
						roleId: role.id,
					});

					await interaction.reply({
						content: "Reaction role created",
						flags: MessageFlags.Ephemeral
					});
				} catch (error) {
					await interaction.reply({
						content: "Failed to create reaction role",
						flags: MessageFlags.Ephemeral
					});

					const guildPreferences = await GuildPreferencesCache.get(
						interaction.guildId,
					);

					if (!guildPreferences) {
						await interaction.reply({
							content:
								"Please setup the bot using the command `/setup` first.",
							flags: MessageFlags.Ephemeral
						});
						return;
					}

					client.log(
						error,
						`${this.data.name} Command`,
						`**Channel:** <#${interaction.channel?.id}>
							**User:** <@${interaction.user.id}>
							**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
					);
				}

				break;
			}

			default:
				break;
		}
	}
}
