import { ScheduledMessage } from "@/mongo/schemas/ScheduledMessage";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import {
	ActionRowBuilder,
	EmbedBuilder,
	ModalBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	StageChannel,
	TextChannel,
	TextInputBuilder,
	TextInputStyle,
	VoiceChannel,
} from "discord.js";

export default class KickCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("message")
				.setDescription("Sends or Edits a Message (for mods)")
				.addSubcommand((command) =>
					command
						.setName("send")
						.setDescription("Send a message")
						.addChannelOption((option) =>
							option
								.setName("channel")
								.setDescription("Channel to send message")
								.setRequired(false),
						)
						.addNumberOption((option) =>
							option
								.setName("schedule_time")
								.setDescription(
									"When to send the message. (Epoch) (Defaults to immediately)",
								)
								.setRequired(false),
						),
				)
				.addSubcommand((command) =>
					command
						.setName("edit")
						.setDescription("Edit a message")
						.addStringOption((option) =>
							option
								.setName("message_id")
								.setDescription("Id of message to edit"),
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

		if (interaction.options.getSubcommand() === "send") {
			const channel =
				interaction.options.getChannel("channel", false) ||
				interaction.channel;

			if (
				!(channel instanceof TextChannel) &&
				!(channel instanceof VoiceChannel) &&
				!(channel instanceof StageChannel)
			) {
				interaction.reply({
					content: "This is not a text channel",
					ephemeral: true,
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
					ephemeral: true,
				});

				return;
			}

			const replyMessageId = new TextInputBuilder()
				.setCustomId("reply_message_id")
				.setLabel("Reply Message Id")
				.setPlaceholder("ID of the message you want to reply to")
				.setRequired(false)
				.setStyle(TextInputStyle.Short);

			const messageContent = new TextInputBuilder()
				.setCustomId("message_content")
				.setLabel("Message Content")
				.setPlaceholder("The body of the message you wish to send")
				.setRequired(true)
				.setStyle(TextInputStyle.Paragraph);

			const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(
				replyMessageId,
			);

			const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(
				messageContent,
			);

			const modal = new ModalBuilder()
				.setTitle("Send a message!")
				.setCustomId("send_message")
				.addComponents(row1, row2);

			await interaction.showModal(modal);

			interaction
				.awaitModalSubmit({
					filter: (i) =>
						i.customId === "send_message" &&
						i.user.id === interaction.user.id,

					time: 300_000, // 5 minutes
				})
				.then(async (i) => {
					if (scheduleTime) {
						await ScheduledMessage.create({
							guildId: interaction.guildId,
							channelId: channel.id,
							message: {
								content:
									i.fields.getTextInputValue(
										"message_content",
									),
								reply: {
									messageReference:
										i.fields.getTextInputValue(
											"reply_message_id",
										),
								},
							},
							scheduleTime,
						});

						await i.reply({
							content: `Message scheduled to be sent in ${channel} <t:${scheduleTime}:R>`,
							ephemeral: true,
						});

						const guildPreferences =
							await GuildPreferencesCache.get(
								interaction.guildId,
							);

						if (
							!guildPreferences ||
							!guildPreferences.generalLogsChannelId
						) {
							interaction.reply({
								content:
									"Please setup the bot using the command `/setup` first.",
								ephemeral: true,
							});
							return;
						}

						await Logger.channel(
							interaction.guild,
							guildPreferences.generalLogsChannelId,
							{
								embeds: [
									new EmbedBuilder()
										.setTitle("Message Scheduled")
										.setDescription(
											`Message scheduled by ${interaction.user.tag} (${interaction.user.id}) in <#${channel.id}>`,
										)
										.setColor("Green")
										.addFields(
											{
												name: "Message Content",
												value:
													i.fields.getTextInputValue(
														"message_content",
													) ?? "None",
												inline: true,
											},
											{
												name: "Scheduled Time",
												value: `<t:${scheduleTime}> (<t:${scheduleTime}:R>)`,
												inline: true,
											},
										)
										.setTimestamp(scheduleTime * 1000),
								],
							},
						).catch(() => {
							interaction.followUp({
								content: "Invalid log channel, contact admins",
								ephemeral: true,
							});
						});

						return;
					}

					await channel.send({
						content: i.fields.getTextInputValue("message_content"),
						reply: {
							messageReference:
								i.fields.getTextInputValue("reply_message_id"),
						},
					});

					await i.reply({
						content: "Message sent!",
						ephemeral: true,
					});

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
							ephemeral: true,
						});
						return;
					}

					await Logger.channel(
						interaction.guild,
						guildPreferences.generalLogsChannelId,
						{
							embeds: [
								new EmbedBuilder()
									.setTitle("Message Sent")
									.setDescription(
										`Message sent by ${interaction.user.tag} (${interaction.user.id}) in <#${channel.id}>`,
									)
									.setColor("Green")
									.addFields({
										name: "Message Content",
										value:
											i.fields.getTextInputValue(
												"message_content",
											) ?? "None",
										inline: true,
									})
									.setTimestamp(),
							],
						},
					);
				})
				.catch(Logger.error);
			Logger.info(`Message sent by ${interaction.user.username}`);
		} else if (interaction.options.getSubcommand() === "edit") {
			const messageId = interaction.options.getString("message_id", true);

			const messageContent = new TextInputBuilder()
				.setCustomId("message_content")
				.setLabel("Message Content")
				.setPlaceholder("The body of the message you wish to send")
				.setRequired(true)
				.setStyle(TextInputStyle.Paragraph);

			const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
				messageContent,
			);

			const message = await interaction.channel.messages.fetch(messageId);
			const oldMessageContent = message.content;

			if (!message) {
				await interaction.reply({
					content: "Message not found",
					ephemeral: true,
				});

				return;
			}

			const modal = new ModalBuilder()
				.setTitle("Edit a message!")
				.setCustomId("edit_message")
				.addComponents(row);

			await interaction.showModal(modal);

			interaction
				.awaitModalSubmit({
					filter: (i) =>
						i.customId === "edit_message" &&
						i.user.id === interaction.user.id,
					time: 300_000, // 5 minutes
				})
				.then(async (i) => {
					if (!interaction.channel) return;

					await message.edit({
						content: i.fields.getTextInputValue("message_content"),
					});

					await i.reply({
						content: "Message edited!",
						ephemeral: true,
					});

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
							ephemeral: true,
						});
						return;
					}

					await Logger.channel(
						interaction.guild,
						guildPreferences.generalLogsChannelId,
						{
							embeds: [
								new EmbedBuilder()
									.setTitle("Message Edited")
									.setDescription(
										`Message edited by ${interaction.user.tag} (${interaction.user.id}) in <#${interaction.channel.id}>`,
									)
									.setColor("Green")
									.addFields(
										{
											name: "New Message Content",
											value:
												i.fields.getTextInputValue(
													"message_content",
												) ?? "None",
											inline: true,
										},
										{
											name: "Old Message Content",
											value: oldMessageContent,
											inline: true,
										},
									)
									.setTimestamp(),
							],
						},
					);
				})
				.catch(Logger.error);
			Logger.info(`Message edited by ${interaction.user.username}`);
		}
	}
}
