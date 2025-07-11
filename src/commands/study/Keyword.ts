import { GuildPreferencesCache, KeywordCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import { Logger } from "@discordforge/logger";
import {
	ActionRowBuilder,
	type AutocompleteInteraction,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	Colors,
	EmbedBuilder,
	type InteractionEditReplyOptions,
	type InteractionReplyOptions,
	type Message,
	type MessageCreateOptions,
	type MessageEditOptions,
	ModalBuilder,
	type ModalSubmitInteraction,
	SlashCommandBuilder,
	TextInputBuilder,
	TextInputStyle,
	MessageFlags,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "../../registry/Structure/BaseCommand";

export default class KeywordCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("keyword")
				.setDescription("Send the keyword's response")
				.addSubcommand((command) =>
					command
						.setName("search")
						.setDescription("Search for a keyword")
						.addStringOption((option) =>
							option
								.setName("keyword")
								.setDescription("The keyword's name")
								.setAutocomplete(true)
								.setRequired(true),
						)
						.addBooleanOption((option) =>
							option
								.setName("hidden")
								.setDescription(
									"Whether the keyword should be only shown to you",
								),
						),
				)
				.addSubcommand((command) =>
					command
						.setName("request")
						.setDescription("Request a keyword"),
				)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const guildId = interaction.guildId;
		if (interaction.options.getSubcommand() === "search") {
			const keyword = interaction.options
				.getString("keyword", true)
				.trim()
				.toLowerCase();
			const hidden = interaction.options.getBoolean("hidden", false);
			const entry = await KeywordCache.get(guildId, keyword);
			if (entry.response) {
				const messageOptions = (await formatMessage(
					interaction,
					entry.response,
					Boolean(hidden),
					keyword,
					entry.imageLink,
				)) as InteractionReplyOptions;
				if (hidden) {
					const sendButton = new ButtonBuilder()
						.setLabel("Send")
						.setStyle(ButtonStyle.Success)
						.setCustomId("keyword_search_send");
					messageOptions.components = [
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							sendButton,
						),
					];
				}
				await interaction.reply(messageOptions);
			} else {
				await interaction.reply({
					content: "Keyword not found",
					flags: MessageFlags.Ephemeral,
				});
			}
		} else if (interaction.options.getSubcommand() === "request") {
			const guildPreferences = await GuildPreferencesCache.get(guildId);

			if (
				!guildPreferences ||
				!guildPreferences.keywordRequestChannelId
			) {
				await interaction.reply({
					content:
						"Please setup the bot using the command `/setup` first.",
					flags: MessageFlags.Ephemeral,
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
					flags: MessageFlags.Ephemeral,
				});

				return;
			}

			const customId = uuidv4();
			const modal = new ModalBuilder()
				.setCustomId(`${customId}_modal`)
				.setTitle("Request for a keyword to be added");

			const keywordNameInput = new TextInputBuilder()
				.setCustomId("keyword_request_name")
				.setLabel("Keyword name")
				.setStyle(TextInputStyle.Short);

			const keywordValueInput = new TextInputBuilder()
				.setCustomId("keyword_request_value")
				.setLabel("Keyword response")
				.setPlaceholder(
					"Normal discord message format, mods can help edit",
				)
				.setStyle(TextInputStyle.Paragraph);

			const imageLinkInput = new TextInputBuilder()
				.setCustomId("keyword_request_image")
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
			let keywordResponse = "";
			let imageLink: string | undefined;
			let currentInteraction:
				| DiscordChatInputCommandInteraction<"cached">
				| ModalSubmitInteraction<"cached">
				| ButtonInteraction<"cached"> = interaction;
			while (action !== "send") {
				modal.components[0].components[0].setValue(keywordName);
				modal.components[1].components[0].setValue(keywordResponse);

				await (
					currentInteraction as DiscordChatInputCommandInteraction<"cached">
				).showModal(modal);

				currentInteraction = await interaction.awaitModalSubmit({
					time: 600_000,
					filter: (i) => i.customId === `${customId}_modal`,
				});
				await currentInteraction.deferReply({
					flags: MessageFlags.Ephemeral,
				});

				keywordName = currentInteraction.fields
					.getTextInputValue("keyword_request_name")
					.trim()
					.toLowerCase();
				keywordResponse = currentInteraction.fields.getTextInputValue(
					"keyword_request_value",
				);
				imageLink = currentInteraction.fields.getTextInputValue(
					"keyword_request_image",
				);

				const messagePreview = (await formatMessage(
					interaction,
					keywordResponse,
					true,
					keywordName,
					imageLink,
				)) as MessageEditOptions;

				const sendButton = new ButtonBuilder()
					.setLabel("Send")
					.setStyle(ButtonStyle.Success)
					.setCustomId(`${customId}_keyword_send`);

				const editButton = new ButtonBuilder()
					.setLabel("Edit")
					.setStyle(ButtonStyle.Primary)
					.setCustomId(`${customId}_keyword_edit`);

				const cancelButton = new ButtonBuilder()
					.setLabel("Cancel")
					.setStyle(ButtonStyle.Danger)
					.setCustomId(`${customId}_keyword_cancel`);

				const previewButtonRows =
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						sendButton,
						editButton,
						cancelButton,
					);

				messagePreview.components = [previewButtonRows];

				const response =
					await currentInteraction.editReply(messagePreview);

				try {
					const buttonInteraction =
						(await response.awaitMessageComponent({
							time: 1_800_000,
						})) as ButtonInteraction<"cached">; // = 30 mins
					action = buttonInteraction.customId.split("_").at(-1) ?? "";
					if (action === "cancel") {
						await currentInteraction.editReply({
							content: "Keyword request cancelled",
							embeds: [],
							components: [],
						});
						return;
					}
					if (action === "edit") {
						currentInteraction = buttonInteraction;
					}
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

			const approvalMessage = (await formatMessage(
				interaction,
				keywordResponse,
				false,
				keywordName,
				imageLink,
				true,
			)) as MessageCreateOptions;
			const approveButton = new ButtonBuilder()
				.setLabel("Approve")
				.setStyle(ButtonStyle.Success)
				.setCustomId("keyword_accept");

			const editedApproveButton = new ButtonBuilder()
				.setLabel("Approve with an edit (add keyword before click)")
				.setStyle(ButtonStyle.Primary)
				.setCustomId("keyword_edited");

			const rejectButton = new ButtonBuilder()
				.setLabel("Reject")
				.setStyle(ButtonStyle.Danger)
				.setCustomId("keyword_reject");

			const buttonsRow =
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					approveButton,
					editedApproveButton,
					rejectButton,
				);

			approvalMessage.components = [buttonsRow];

			await keywordRequestChannel.send(approvalMessage);

			await currentInteraction.editReply({
				// it can only exit while loop if it's a button interaction
				content:
					"Your keyword request has been sent to the moderators.\nYou have to wait for their approval.",
				embeds: [],
				components: [],
			});
		}
	}

	async autoComplete(interaction: AutocompleteInteraction) {
		await performAutoComplete(interaction);
	}
}

export async function formatMessage(
	interaction: DiscordChatInputCommandInteraction<"cached"> | Message,
	keywordResponse: string,
	ephemeral: boolean,
	keywordName: string,
	imageLink?: string,
	id = false,
): Promise<
	MessageCreateOptions | InteractionReplyOptions | InteractionEditReplyOptions
> {
	const iconUrl = interaction.member?.displayAvatarURL();
	// message.user doesn't exist so using .member.user instead which supports both interaction and message
	const text = `Requested by ${interaction.member?.user.tag}${id ? ` (${interaction.member?.user.id})` : ""}`; // change regex in the other file if you are gonna change this
	const footerOptions = iconUrl ? { text, iconUrl } : { text };
	const embed = new EmbedBuilder()
		.setDescription(keywordResponse)
		.setFooter(footerOptions)
		.setColor(Colors.Blurple);
	const formattedKeywordName = keywordName // capitalize each intial of word
		.trim()
		.toLowerCase()
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
	if (formattedKeywordName) {
		embed.setTitle(`${formattedKeywordName}`);
	}
	if (imageLink) {
		embed.setImage(imageLink);
	}
	return { embeds: [embed], ephemeral };
}

export async function performAutoComplete(
	interaction: AutocompleteInteraction,
) {
	const guildId = interaction.guildId;
	if (!guildId) {
		return;
	}
	const phrase = interaction.options.getFocused();
	KeywordCache.autoComplete(guildId, phrase)
		.then(async (keywords) => {
			await interaction.respond(
				keywords
					.map((keyword) => ({ name: keyword, value: keyword }))
					.slice(0, 25),
			);
		})
		.catch(Logger.error);
}
