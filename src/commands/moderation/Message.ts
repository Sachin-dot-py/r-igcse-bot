import { logger } from "@/index";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	ModalBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TextChannel,
	TextInputBuilder,
	TextInputStyle,
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
						.addChannelOption((option) =>
							option
								.setName("channel")
								.setDescription("Channel to send message")
								.setRequired(false),
						),
				)
				.addSubcommand((command) =>
					command
						.setName("edit")
						.addIntegerOption((option) =>
							option
								.setName("messageId")
								.setDescription("Id of message to send"),
						),
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient,
		interaction: DiscordChatInputCommandInteraction,
	) {
		if (!interaction.guild || !interaction.channel) return;

		if (interaction.options.getSubcommand() === "send") {
			const channel =
				interaction.options.getChannel("channel", false) || interaction.channel;

			if (!(channel instanceof TextChannel)) return;

			const replyMessageId = new TextInputBuilder()
				.setCustomId("replyMessageId")
				.setLabel("Reply Message Id")
				.setPlaceholder("ID of the message you want to reply to")
				.setRequired(false)
				.setStyle(TextInputStyle.Short);

			const messageContent = new TextInputBuilder()
				.setCustomId("messageContent")
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
				.setCustomId("sendMessage")
				.addComponents(row1, row2);

			await interaction.showModal(modal);

			interaction
				.awaitModalSubmit({
					filter: (i) =>
						i.customId === "sendMessage" && i.user.id === interaction.user.id,

					time: 24000000,
				})
				.then(async (i) => {
					await channel.send({
						content: i.fields.getTextInputValue("messageContent"),
						reply: {
							messageReference: i.fields.getTextInputValue("replyMessageId"),
						},
					});
				})
				.catch(logger.error);
		} else if (interaction.options.getSubcommand() === "edit") {
			const messageId = interaction.options.getString("messageId", true);

			const messageContent = new TextInputBuilder()
				.setCustomId("messageContent")
				.setLabel("Message Content")
				.setPlaceholder("The body of the message you wish to send")
				.setRequired(true)
				.setStyle(TextInputStyle.Paragraph);

			const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
				messageContent,
			);

			const message = interaction.channel.messages.cache.get(messageId);

			// TODO: Logging
			if (!message) return;

			const modal = new ModalBuilder()
				.setTitle("Edit a message!")
				.setCustomId("editMessage")
				.addComponents(row);

			await interaction.showModal(modal);

			interaction
				.awaitModalSubmit({
					filter: (i) =>
						i.customId === "editMessage" && i.user.id === interaction.user.id,
					time: 24000000,
				})
				.then(async (i) => {
					if (!interaction.channel) return;

					await message.edit({
						content: i.fields.getTextInputValue("messageContent"),
					});
				})
				.catch(logger.error);
		}
	}
}
