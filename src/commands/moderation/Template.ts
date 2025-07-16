import { DmTemplate } from "@/mongo";
import { DmTemplateCache } from "@/redis";
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
						.addBooleanOption((opt) =>
							opt
								.setName("anonymous")
								.setDescription("Send anonymously or not")
								.setRequired(true),
						)
						.addStringOption((opt) =>
							opt
								.setName("name")
								.setDescription("Template name")
								.setRequired(true)
								.setAutocomplete(true),
						)
						.addUserOption((opt) =>
							opt
								.setName("user")
								.setDescription(
									"User to DM (optional if in DM thread)",
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
		const userId = interaction.user.id;

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
				await interaction.reply({
					content: `Template \"${name}\" not found.`,
					flags: MessageFlags.Ephemeral,
				});
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

		if (sub === "send") {
			const name = interaction.options.getString("name", true);
			const user = interaction.options.getUser("user");
			const anonymous = interaction.options.getBoolean("anonymous", true);
			const template = await DmTemplateCache.get(guildId ?? "", name);
			if (!template) {
				await interaction.reply({
					content: `Template \"${name}\" not found.`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			// Prepare the preview message (replace {username} for preview, if possible)
			const previewMessage = template.message.replace(/\{username\}/g, user ? user.username : interaction.user.username);

			await interaction.reply({
				content: `You are about to send the following template:\n\n${previewMessage}`,
				flags: MessageFlags.Ephemeral,
				components: [
					{
						type: 1, // ActionRow
						components: [
							{
								type: 2, // Button
								style: 1, // Primary
								custom_id: `${name}_template_continue`,
								label: "Continue",
							},
						],
					},
				],
			});
			return;
		}

		if (sub === "delete") {
			const name = interaction.options.getString("name", true);
			const template = await DmTemplateCache.get(guildId ?? "", name);
			if (!template) {
				await interaction.reply({
					content: `Template \"${name}\" not found.`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			// Remove from MongoDB
			await DmTemplate.deleteOne({ guildId, name });
			// Remove from Redis
			await DmTemplateCache.delete(guildId ?? "", name);
			await interaction.reply({
				content: `Template \`${name}\` deleted!`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await interaction.reply({
			content: "This subcommand is not yet implemented.",
			flags: MessageFlags.Ephemeral,
		});
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
