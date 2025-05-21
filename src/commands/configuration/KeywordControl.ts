import { Keyword } from "@/mongo/schemas/Keyword";
import { GuildPreferencesCache, KeywordCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	type AutocompleteInteraction,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type MessageEditAttachmentData,
	type MessageEditOptions,
	ModalBuilder,
	type ModalSubmitInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";
import { formatMessage, performAutoComplete } from "../study/Keyword";

export default class KeywordControlCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("keyword_control")
				.setDescription("Create / Delete keywords for a server")
				.addSubcommand((command) =>
					command.setName("add").setDescription("Add a keyword"),
				)
				.addSubcommand((command) =>
					command
						.setName("remove")
						.setDescription("Remove a keyword")
						.addStringOption((option) =>
							option
								.setName("keyword")
								.setDescription("Keyword to remove")
								.setRequired(true)
								.setAutocomplete(true),
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
		const guildId = interaction.guildId;
		if (interaction.options.getSubcommand() === "add") {
			const guildPreferences = await GuildPreferencesCache.get(guildId);

			if (
				!guildPreferences ||
				!guildPreferences.keywordRequestChannelId
			) {
				await interaction.reply({
					content:
						"Please setup the bot using the command `/setup` first.",
					flags: MessageFlags.Ephemeral
				});

				return;
			}

			const keywordRequestChannel = interaction.guild.channels.cache.get(
				guildPreferences.keywordRequestChannelId,
			);

			if (
				!keywordRequestChannel ||
				!keywordRequestChannel.isTextBased()
			) {
				await interaction.reply({
					content:
						"Invalid configuration for keyword requests. Please contact an admin.",
					flags: MessageFlags.Ephemeral
				});

				return;
			}

			const customId = uuidv4();
			const modal = new ModalBuilder()
				.setCustomId(`${customId}_modal`)
				.setTitle("Request for a keyword to be added");

			const keywordNameInput = new TextInputBuilder()
				.setCustomId("keyword_add_name")
				.setLabel("Keyword name")
				.setStyle(TextInputStyle.Short);

			const keywordValueInput = new TextInputBuilder()
				.setCustomId("keyword_add_value")
				.setLabel("Keyword response")
				.setPlaceholder(
					"Normal discord message format, mods can help edit",
				)
				.setStyle(TextInputStyle.Paragraph);

			const imageLinkInput = new TextInputBuilder()
				.setCustomId("keyword_add_image")
				.setLabel("Keyword image link (optional)")
				.setStyle(TextInputStyle.Short)
				.setRequired(false);

			modal.addComponents(
				new ActionRowBuilder<TextInputBuilder>().addComponents(
					keywordNameInput,
				),
				new ActionRowBuilder<TextInputBuilder>().addComponents(
					keywordValueInput,
				),
				new ActionRowBuilder<TextInputBuilder>().addComponents(
					imageLinkInput,
				),
			);

			let action = "";
			let keywordName = "";
			let keywordReponse = "";
			let imageLink: string | undefined;
			let currentInteraction:
				| DiscordChatInputCommandInteraction<"cached">
				| ModalSubmitInteraction<"cached">
				| ButtonInteraction<"cached"> = interaction;
			while (action !== "add") {
				await (
					currentInteraction as DiscordChatInputCommandInteraction<"cached">
				).showModal(modal);

				currentInteraction = await interaction.awaitModalSubmit({
					time: 600_000,
					filter: (i) => i.customId === `${customId}_modal`,
				});
				await currentInteraction.deferReply({ flags: MessageFlags.Ephemeral });

				keywordName = currentInteraction.fields
					.getTextInputValue("keyword_add_name")
					.trim()
					.toLowerCase();
				keywordReponse =
					currentInteraction.fields.getTextInputValue(
						"keyword_add_value",
					);
				imageLink =
					currentInteraction.fields.getTextInputValue(
						"keyword_add_image",
					);

				const messagePreview = (await formatMessage(
					interaction,
					keywordReponse,
					true,
					keywordName,
					imageLink,
				)) as MessageEditOptions;

				const addButton = new ButtonBuilder()
					.setLabel("Add")
					.setStyle(ButtonStyle.Success)
					.setCustomId(`${customId}_keyword_add`);

				const editButton = new ButtonBuilder()
					.setLabel("Edit (COPY TEXT FIRST)")
					.setStyle(ButtonStyle.Primary)
					.setCustomId(`${customId}_keyword_edit`);

				const cancelButton = new ButtonBuilder()
					.setLabel("Cancel")
					.setStyle(ButtonStyle.Danger)
					.setCustomId(`${customId}_keyword_cancel`);

				const previewButtonRows =
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						addButton,
						editButton,
						cancelButton,
					);

				messagePreview.components = [previewButtonRows];

				const response =
					await currentInteraction.editReply(messagePreview);

				try {
					const buttonInteraction =
						await response.awaitMessageComponent({
							time: 1_800_000,
						}); // = 30 mins
					action = buttonInteraction.customId.split("_").at(-1) ?? "";
					if (action === "cancel") {
						await currentInteraction.editReply({
							content: "Keyword addition cancelled",
							embeds: [],
							components: [],
						});
						return;
					}
					currentInteraction =
						buttonInteraction as ButtonInteraction<"cached">;
				} catch (e) {
					await currentInteraction.editReply({
						content:
							"Confirmation not received within 30 minutes, cancelling",
						embeds: [],
						components: [],
					});
					return;
				}
			}

			await addKeyword(
				currentInteraction as ButtonInteraction<"cached">,
				keywordName,
				keywordReponse,
				imageLink,
			);
		} else if (interaction.options.getSubcommand() === "remove") {
			const keyword = interaction.options.getString("keyword", true);

			const res = await Keyword.deleteOne({
				guildId: interaction.guildId,
				keyword,
			});

			if (res.deletedCount < 1) {
				await interaction.reply({
					content:
						"Error occurred while deleting keyword. Please try again later.",
					flags: MessageFlags.Ephemeral
				});
				return;
			}

			await KeywordCache.delete(interaction.guildId, keyword);

			await interaction.reply({
				content: `Successfully deleted \`${keyword}\`.`,
				flags: MessageFlags.Ephemeral
			});
		}
	}

	async autoComplete(interaction: AutocompleteInteraction) {
		await performAutoComplete(interaction);
	}
}

export async function addKeyword(
	interaction: ButtonInteraction,
	keyword: string,
	response: string,
	imageLink?: string,
) {
	const trimmedKeyword = keyword.trim().toLowerCase();
	const res = await Keyword.updateOne(
		{
			guildId: interaction.guildId,
			keyword: trimmedKeyword,
		},
		{
			response,
			imageLink,
		},
		{
			upsert: true,
		},
	);

	if (res.modifiedCount + res.upsertedCount < 1) {
		console.error(
			`Failed to update or upsert keyword. Response: ${JSON.stringify(res)}`,
		);
		await interaction.reply({
			content:
				"Error occurred while creating keyword. Please try again later.",
			flags: MessageFlags.Ephemeral
		});
		return;
	}

	if (!interaction.guildId) {
		console.error("Failed to add keyword: No guild ID found");
		return;
	}

	await KeywordCache.append({
		guildId: interaction.guildId,
		keyword: trimmedKeyword,
		response,
		imageLink,
	});

	await interaction.reply({
		content: `Successfully created keyword \`${keyword}\`.`,
		flags: MessageFlags.Ephemeral
	});
}
