import { ResourceTag } from "@/mongo";
import { StudyChannel } from "@/mongo/schemas/StudyChannel.ts";
import { ButtonInteractionCache, GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordMessageContextMenuCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ContextMenuCommandBuilder,
	EmbedBuilder,
	type Message,
	ModalBuilder,
	type PublicThreadChannel,
	TextInputBuilder,
	TextInputStyle,
	MessageFlags,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";

export default class StickMessageCommand extends BaseCommand {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("Create Resource Tag")
				.setDMPermission(false)
				.setType(ApplicationCommandType.Message),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordMessageContextMenuCommandInteraction<"cached">,
	) {
		if (!interaction.channel) return;
		const targetMessage = interaction.targetMessage;

		const channelId = interaction.channel.isThread()
			? (interaction.channel.parentId ?? "")
			: interaction.channel.id;

		const studyChannel = await StudyChannel.findOne({
			guildId: interaction.guildId,
			channelId: channelId,
		});

		if (!studyChannel) {
			interaction.reply({
				content: "This can only be used for a study channel!",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);

		if (
			!guildPreferences ||
			!guildPreferences.tagResourceApprovalChannelId
		) {
			await interaction.reply({
				content:
					"Please setup the bot using the command `/setup` first.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const approvalChannel = interaction.guild.channels.cache.get(
			guildPreferences?.tagResourceApprovalChannelId,
		);

		if (!approvalChannel || !approvalChannel.isTextBased()) {
			await interaction.reply({
				content:
					"Invalid configuration for resource tags. Please contact an admin.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const tags = await ResourceTag.findOne({
			messageUrl: targetMessage.url,
		});

		if (tags) {
			await interaction.reply({
				content:
					"This message already has already been tagged as a resource.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const titleInput = new TextInputBuilder()
			.setCustomId("tag-title-input")
			.setLabel("Title")
			.setPlaceholder("Enter the title of the tag")
			.setRequired(true)
			.setStyle(TextInputStyle.Short);

		const descriptionInput = new TextInputBuilder()
			.setCustomId("tag-description-input")
			.setLabel("Description")
			.setPlaceholder("Enter the description of the tag")
			.setRequired(true)
			.setStyle(TextInputStyle.Paragraph);

		const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(
			titleInput,
		);

		const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(
			descriptionInput,
		);

		const modalCustomId = uuidv4();

		const modal = new ModalBuilder()
			.setCustomId(modalCustomId)
			.setTitle("Request Resource Tag")
			.addComponents(row1, row2);

		await interaction.showModal(modal);

		const modalInteraction = await interaction.awaitModalSubmit({
			time: 600_000,
			filter: (i) => i.customId === modalCustomId,
		});

		const title =
			modalInteraction.fields.getTextInputValue("tag-title-input");
		const description = modalInteraction.fields.getTextInputValue(
			"tag-description-input",
		);

		await modalInteraction.reply({
			content:
				"Your tag request has been sent to the helpers.\nYou have to wait for them to approve it.",
			flags: MessageFlags.Ephemeral,
		});

		const embed = new EmbedBuilder()
			.setTitle(title)
			.setDescription(description)
			.setColor("Random")
			.addFields(
				{
					name: "Requested By",
					value: interaction.user.tag,
					inline: true,
				},
				{
					name: "Message Link",
					value: targetMessage.url,
					inline: true,
				},
				{
					name: "Channel",
					value: `<#${channelId}>`,
					inline: true,
				},
			)
			.setAuthor({
				name: `${interaction.user.tag} | ${interaction.user.id}`,
				iconURL: interaction.user.displayAvatarURL(),
			});

		const customId = uuidv4();

		const approveButton = new ButtonBuilder()
			.setCustomId(`${customId}_tag_accept`)
			.setLabel("Approve")
			.setStyle(ButtonStyle.Success);

		const rejectButton = new ButtonBuilder()
			.setCustomId(`${customId}_tag_reject`)
			.setLabel("Reject")
			.setStyle(ButtonStyle.Danger);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			approveButton,
			rejectButton,
		);

		const message = await approvalChannel.send({
			embeds: [embed],
			components: [row],
		});

		await ButtonInteractionCache.set(`${customId}_tag`, {
			customId: `${customId}_tag`,
			messageId: message.id,
			guildId: interaction.guildId,
			userId: interaction.user.id,
		});

		await ButtonInteractionCache.expire(
			`${customId}_tag`,
			14 * 24 * 60 * 60,
		);
	}
}
