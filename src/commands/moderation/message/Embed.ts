import { ScheduledMessage } from "@/mongo/schemas/ScheduledMessage";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { logToChannel } from "@/utils/Logger";
import { Logger } from "@discordforge/logger";
import {
	ActionRowBuilder,
	EmbedBuilder,
	type HexColorString,
	ModalBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TextInputBuilder,
	TextInputStyle,
	MessageFlags,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";

const hexRegex = /^#?[\da-f]{6}$/i;

export default class EmbedCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("embed")
				.setDescription("Sends an embed")
				.addSubcommand((command) =>
					command
						.setName("send")
						.setDescription("Send an embed")
						.addChannelOption((option) =>
							option
								.setName("channel")
								.setDescription(
									"Channel to send the embed in (default is current channel)",
								)
								.setRequired(false),
						)
						.addNumberOption((option) =>
							option
								.setName("schedule_time")
								.setDescription(
									"When to send the embed. (Epoch) (Defaults to immediately)",
								)
								.setRequired(false),
						)
						.addRoleOption((option) =>
							option
								.setName("role_ping")
								.setDescription("Select a role to ping")
								.setRequired(false),
						),
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel) return;

		switch (interaction.options.getSubcommand()) {
			case "send": {
				const channel =
					interaction.options.getChannel("channel", false) ||
					interaction.channel;

				if (!channel.isTextBased()) {
					await interaction.reply({
						content:
							"Invalid channel type, must be a text channel.",
						flags: MessageFlags.Ephemeral,
					});

					return;
				}

				const scheduleTime = interaction.options.getNumber(
					"schedule_time",
					false,
				);

				if (scheduleTime && scheduleTime <= Date.now() / 1000) {
					interaction.reply({
						content: "Scheduled time cannot be in the past",
						flags: MessageFlags.Ephemeral,
					});

					return;
				}

				const customId = uuidv4();

				const embedTitleField = new TextInputBuilder()
					.setPlaceholder("Title")
					.setRequired(false)
					.setStyle(TextInputStyle.Short)
					.setLabel("Embed Title")
					.setCustomId("title");

				const embedDescriptionField = new TextInputBuilder()
					.setPlaceholder("Description")
					.setRequired(false)
					.setStyle(TextInputStyle.Paragraph)
					.setLabel("Embed Description")
					.setCustomId("description");

				const embedFooterField = new TextInputBuilder()
					.setPlaceholder("Footer")
					.setRequired(false)
					.setStyle(TextInputStyle.Short)
					.setLabel("Embed Footer")
					.setCustomId("footer");

				const embedColourField = new TextInputBuilder()
					.setPlaceholder("Hex Colour")
					.setRequired(false)
					.setStyle(TextInputStyle.Short)
					.setLabel("Colour")
					.setCustomId("colour");

				const actionRows = [
					new ActionRowBuilder<TextInputBuilder>().addComponents(
						embedTitleField,
					),
					new ActionRowBuilder<TextInputBuilder>().addComponents(
						embedDescriptionField,
					),
					new ActionRowBuilder<TextInputBuilder>().addComponents(
						embedFooterField,
					),
					new ActionRowBuilder<TextInputBuilder>().addComponents(
						embedColourField,
					),
				];

				const modal = new ModalBuilder()
					.setTitle("Embed Builder")
					.setCustomId(customId)
					.addComponents(...actionRows);

				await interaction.showModal(modal);

				const modalInteraction = await interaction.awaitModalSubmit({
					time: 300_000,
					filter: (i) =>
						i.customId === customId &&
						i.user.id === interaction.user.id,
				});

				const embedTitle =
					modalInteraction.fields.getTextInputValue("title") || null;
				const embedDescription =
					modalInteraction.fields.getTextInputValue("description") ||
					null;
				const embedFooter =
					modalInteraction.fields.getTextInputValue("footer") || null;
				const embedColour =
					modalInteraction.fields
						.getTextInputValue("colour")
						.trim() || null;

				if (!embedTitle && !embedDescription && !embedFooter) {
					await modalInteraction.reply({
						content:
							"You must provide at least one field to send an embed!",
						flags: MessageFlags.Ephemeral,
					});

					return;
				}

				const embed = new EmbedBuilder()
					.setTitle(embedTitle)
					.setDescription(embedDescription);

				if (embedColour)
					if (hexRegex.test(embedColour)) {
						try {
							embed.setColor(embedColour as HexColorString);
						} finally {
						}
					} else {
						modalInteraction.reply({
							content:
								"The hex colour provided is invalid.\n-# Format: #FFFFFF",
							flags: MessageFlags.Ephemeral,
						});
					}

				if (embedFooter) {
					embed.setFooter({
						text: embedFooter,
					});
				}

				const role = interaction.options.getRole("role_ping", false);
				const roleMention = role ? `<@&${role.id}>` : "";

				const guildPreferences = await GuildPreferencesCache.get(
					interaction.guildId,
				);

				if (
					!guildPreferences ||
					!guildPreferences.generalLogsChannelId
				) {
					interaction.reply({
						content:
							"Please setup the bot using the command `/setup` first.",
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				logToChannel(
					interaction.guild,
					guildPreferences.generalLogsChannelId,
					{
						embeds: [
							new EmbedBuilder()
								.setTitle("Embed Sent")
								.setDescription(
									`Embed sent by ${interaction.user.tag} (${interaction.user.id}) in <#${channel.id}>, ${scheduleTime ? `Sent <t:${scheduleTime}:R>` : "Unscheduled"}${embedColour ? `, #${embedColour}` : ""}${roleMention ? `, mentions ${roleMention}.` : "."}`,
								)
								.setColor("Green")
								.addFields(
									{
										name: "Embed Title",
										value: embedTitle ?? "None",
									},
									{
										name: "Embed Description",
										value: embedDescription ?? "None",
									},
									{
										name: "Embed Footer",
										value: embedFooter ?? "None",
									},
								)
								.setTimestamp(),
						],
					},
				);

				if (scheduleTime) {
					ScheduledMessage.create({
						guildId: interaction.guildId,
						channelId: channel.id,
						message: { content: roleMention, embeds: [embed.data] },
						scheduleTime: scheduleTime.toString(),
					});

					await modalInteraction.reply({
						content: `Embed scheduled to be sent in ${channel} <t:${scheduleTime}:R>`,
						flags: MessageFlags.Ephemeral,
					});

					return;
				}

				await channel.send({ content: roleMention, embeds: [embed] });

				await modalInteraction.reply({
					content: `Embed sent in the channel ${channel}!`,
					flags: MessageFlags.Ephemeral,
				});

				Logger.info(`Embed sent by ${interaction.user.username}`);
				break;
			}

			default:
				break;
		}
	}
}
