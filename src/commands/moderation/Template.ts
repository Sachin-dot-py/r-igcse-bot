import { DmTemplate, PrivateDmThread } from "@/mongo";
import { DmTemplateCache, GuildPreferencesCache } from "@/redis";
import {
	SlashCommandBuilder,
	PermissionFlagsBits,
	type AutocompleteInteraction,
	MessageFlags,
	ModalBuilder,
	ActionRowBuilder,
	TextInputBuilder,
	TextInputStyle,
	InteractionContextType,
	ButtonBuilder,
	ButtonStyle,
	ThreadChannel,
} from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";

export default class TemplateCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("template")
				.setDescription("Manage DM templates for modmail")
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ModerateMembers,
				)
				.setContexts(InteractionContextType.Guild)
				.addSubcommand((sub) =>
					sub.setName("add").setDescription("Add a new DM template"),
				)
				.addSubcommand((sub) =>
					sub
						.setName("send")
						.setDescription("Send a DM template to a user")
						.addStringOption((opt) =>
							opt
								.setName("name")
								.setDescription("Template name")
								.setRequired(true)
								.setAutocomplete(true),
						)
						.addBooleanOption((opt) =>
							opt
								.setName("anonymous")
								.setDescription("Send anonymously or not")
								.setRequired(true),
						)
						.addUserOption((opt) =>
							opt
								.setName("user")
								.setDescription(
									"[REQUIRED IF NOT IN THREAD] User to DM",
								)
								.setRequired(false),
						),
				)
				.addSubcommand((sub) =>
					sub
						.setName("edit")
						.setDescription("Edit a DM template")
						.addStringOption((opt) =>
							opt
								.setName("name")
								.setDescription("Template name")
								.setRequired(true)
								.setAutocomplete(true),
						),
				)
				.addSubcommand((sub) =>
					sub
						.setName("delete")
						.setDescription("Delete a DM template")
						.addStringOption((opt) =>
							opt
								.setName("name")
								.setDescription("Template name")
								.setRequired(true)
								.setAutocomplete(true),
						),
				),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const sub = interaction.options.getSubcommand();
		const guildId = interaction.guildId;

		if (sub === "add") {
			// show modal for add
			const modal = new ModalBuilder()
				.setCustomId("template_add")
				.setTitle("Add DM Template")
				.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(
						new TextInputBuilder()
							.setCustomId("name")
							.setLabel("Template Name")
							.setStyle(TextInputStyle.Short)
							.setRequired(true),
					),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                        new TextInputBuilder()
                            .setCustomId("message")
                            .setLabel("Template Message, can use {fields}")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true),
                    ),
				);

			await interaction.showModal(modal);
			return;
		}

		if (sub === "edit") {
			// Get template name
			const name = interaction.options.getString("name", true);
			const template = await DmTemplateCache.get(guildId ?? "", name);
			if (!template) {
				await interaction.reply(`Template "${name}" not found.`);
				return;
			}
			// show modal for edit
            const modal = new ModalBuilder()
				.setCustomId(`${name}_template_edit`)
				.setTitle(`Edit DM Template: ${name}`)
				.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(
						new TextInputBuilder()
							.setCustomId("name")
							.setLabel("Template Name")
							.setStyle(TextInputStyle.Short)
							.setRequired(true)
							.setValue(template.name),
					),
					new ActionRowBuilder<TextInputBuilder>().addComponents(
						new TextInputBuilder()
							.setCustomId("message")
							.setLabel("Template Message, can use {fields}")
							.setStyle(TextInputStyle.Paragraph)
							.setRequired(true)
							.setValue(template.message),
					),
				);
			await interaction.showModal(modal);
			return;
		}

		// Can't defer reply before showModal
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		if (sub === "send") {
			const name = interaction.options.getString("name", true);
			const user = interaction.options.getUser("user");

			let userId: string | null = null;
			if (user) {
				userId = user.id;
			} else {
				const guildPreferences = await GuildPreferencesCache.get(
					interaction.guildId,
				);
				if (!guildPreferences) {
					await interaction.editReply("Please setup the bot using the command `/setup` first.");
					return;
				}
	
				const inDmChannel = (interaction.channel instanceof ThreadChannel &&
					interaction.channel.parentId ===
					guildPreferences.modmailThreadsChannelId)
				
				if (inDmChannel) {
					const dmThread = await PrivateDmThread.findOne({
						threadId: interaction.channel?.id,
					});
					if (!dmThread) {
						await interaction.editReply("Unable to find the user for this thread.");
						return;
					}
					userId = dmThread.userId;
				} else {
					await interaction.editReply("Please use this command in a dm channel or provide a user.");
					return;
				}
			}
			
			const member = await interaction.guild.members
				.fetch(userId)
				.catch(async () => {
					await interaction.editReply("User is no longer in the server");
					return;
				});
			if (!member) {
				await interaction.editReply("User is no longer in the server");
				return;
			}

			const template = await DmTemplateCache.get(guildId ?? "", name);
			if (!template) {
				await interaction.editReply(`Template "${name}" not found.`);
				return;
			}

			// Prepare the preview message (replace {username} for preview, if possible)
			const previewMessage = template.message.replace(/\{username\}/g, user ? user.username : interaction.user.username);

			await interaction.editReply({
				content: `Recipient: ${member.user.username} ||${member.user.tag}||\nYou are about to send the following template:\n${previewMessage}`,
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`${member.user.id}_${name}_template_continue`)
							.setLabel("Continue")
						.setStyle(ButtonStyle.Primary),
					),
				],
			});
			return;
		}

		if (sub === "delete") {
			const name = interaction.options.getString("name", true);
			const template = await DmTemplateCache.get(guildId ?? "", name);
			if (!template) {
				await interaction.editReply(`Template "${name}" not found.`);
				return;
			}
			// Remove from MongoDB
			await DmTemplate.deleteOne({ guildId, name });
			// Remove from Redis
			await DmTemplateCache.delete(guildId ?? "", name);
			await interaction.editReply(`Template \`${name}\` deleted!`);
			return;
		}
	}

	// Autocomplete for template names
	async autoComplete(interaction: AutocompleteInteraction) {
		const sub = interaction.options.getSubcommand(false);
		const focusedRaw = interaction.options.getFocused();
		const focused = typeof focusedRaw === "string" ? focusedRaw : "";
		const guildId = interaction.guildId;
		if (!guildId || !["edit", "send", "delete"].includes(sub ?? "")) return;
		const focusedOption = interaction.options.getFocused(true);
		if (focusedOption.name !== "name") return;

		const templates = await DmTemplateCache.getAll(guildId);
		if (!templates) return;
		const choices = templates
			.map((t) => t.name)
			.filter((name) =>
				name.toLowerCase().includes(focused.toLowerCase()),
			);
		await interaction.respond(
			choices.slice(0, 25).map((name) => ({ name, value: name })),
		);
	}
}
