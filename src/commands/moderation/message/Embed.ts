import { ScheduledMessage } from "@/mongo/schemas/ScheduledMessage";
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
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";

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

				const customId = uuidv4();

				const embedTitleField = new TextInputBuilder()
					.setPlaceholder("Title")
					.setRequired(false)
					.setStyle(TextInputStyle.Short)
					.setLabel("Embed Title")
					.setCustomId(`title`);

				const embedDescriptionField = new TextInputBuilder()
					.setPlaceholder("Description")
					.setRequired(false)
					.setStyle(TextInputStyle.Paragraph)
					.setLabel("Embed Description")
					.setCustomId(`description`);

				const embedFooterField = new TextInputBuilder()
					.setPlaceholder("Footer")
					.setRequired(false)
					.setStyle(TextInputStyle.Short)
					.setLabel("Embed Footer")
					.setCustomId(`footer`);

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

				if (!embedTitle && !embedDescription && !embedFooter) {
					await modalInteraction.reply({
						content:
							"You must provide at least one field to send an embed!",
						ephemeral: true,
					});

					return;
				}

				const embed = new EmbedBuilder()
					.setTitle(embedTitle)
					.setDescription(embedDescription);

				if (embedFooter) {
					embed.setFooter({
						text: embedFooter,
					});
				}

				if (scheduleTime) {
					ScheduledMessage.create({
						guildId: interaction.guildId,
						channelId: channel.id,
						message: { embeds: [embed.data] },
						scheduleTime: scheduleTime.toString(),
					});

					await modalInteraction.reply({
						content: `Embed scheduled to be sent in ${channel} <t:${scheduleTime}:R>`,
						ephemeral: true,
					});

					return;
				}

				await channel.send({ embeds: [embed] });

				await modalInteraction.reply({
					content: `Embed sent in the channel ${channel}!`,
					ephemeral: true,
				});

				Logger.info(`Embed sent by ${interaction.user.username}`);
				break;
			}

			default:
				break;
		}
	}
}
