import { StickyMessage } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import {
	ActionRowBuilder,
	ChannelSelectMenuBuilder,
	ChannelType,
	ComponentType,
	ContextMenuCommandBuilder,
	ModalBuilder,
	PermissionFlagsBits,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { StickyMessageCache } from "@/redis";
import BaseMenu, {
	type DiscordMessageContextMenuCommandInteraction,
} from "@/registry/Structure/BaseMenu";

export default class StickMessageCommand extends BaseMenu {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("stick")
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordMessageContextMenuCommandInteraction<"cached">,
	) {
		if (!interaction.channel) return;

		if (interaction.targetMessage.embeds.length < 1) {
			interaction.reply({
				content: "This message does not have any embeds.",
				ephemeral: true,
			});

			return;
		}

		const channelSelect = new ChannelSelectMenuBuilder()
			.setCustomId("stick_channel")
			.setPlaceholder("Select a channel")
			.setMaxValues(1)
			.setDefaultChannels(interaction.channel.id)
			.setChannelTypes(ChannelType.GuildText);

		const channelRow =
			new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
				channelSelect,
			);

		const { awaitMessageComponent } = await interaction.reply({
			components: [channelRow],
			ephemeral: true,
		});

		awaitMessageComponent({
			componentType: ComponentType.ChannelSelect,
			filter: (i) =>
				i.user.id === interaction.user.id && i.customId === "stick_channel",
			time: 60000,
		}).then(async (i) => {
			const channelId = i.values[0];

			const channel = interaction.guild.channels.cache.get(channelId);

			if (!channel || !channel.isTextBased()) {
				await interaction.editReply({
					content: "Channel not found / Invalid channel type",
				});

				return;
			}

			const time = Date.now();

			const stickTimeInput = new TextInputBuilder()
				.setCustomId("stick-time")
				.setLabel("Stick Time")
				.setStyle(TextInputStyle.Short)
				.setPlaceholder(time.toString())
				.setRequired(false);

			const unstickTimeInput = new TextInputBuilder()
				.setCustomId("unstick-time")
				.setLabel("Unstick Time")
				.setStyle(TextInputStyle.Short)
				.setPlaceholder((time + 2592000).toString())
				.setRequired(false);

			const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(
				stickTimeInput,
			);
			const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(
				unstickTimeInput,
			);

			const modal = new ModalBuilder()
				.setTitle("Stick Message")
				.setCustomId("stick-message")
				.addComponents(row1, row2);

			await interaction.showModal(modal);

			interaction
				.awaitModalSubmit({
					filter: (i) =>
						i.user.id === interaction.user.id && i.customId === "stick-message",
					time: 90000,
				})
				.then(async (i) => {
					const stickTime =
						parseInt(i.fields.getTextInputValue("stick-time")) || time;
					const unstickTime =
						parseInt(i.fields.getTextInputValue("unstick-time")) ||
						time + 2592000;

					if (isNaN(stickTime) || isNaN(unstickTime)) {
						await interaction.editReply({
							content: "Invalid time(s)",
						});

						return;
					}

					if (stickTime > unstickTime) {
						await interaction.editReply({
							content: "Stick time must be before unstick time.",
						});

						return;
					}

					if (unstickTime < time) {
						await interaction.editReply({
							content: "Unstick time must be before now.",
						});

						return;
					}

					const enabled = stickTime <= time && unstickTime > time;

					const res = await StickyMessage.create({
						channelId: channel.id,
						messageId: null,
						embeds: interaction.targetMessage.embeds.map((embed) =>
							embed.toJSON(),
						),
						enabled,
						stickTime: stickTime.toString(),
						unstickTime: unstickTime.toString(),
					});

					await StickyMessageCache.set(res!.id, {
						channelId: channel.id,
						messageId: null,
						embeds: interaction.targetMessage.embeds.map((embed) =>
							embed.toJSON(),
						),
						enabled,
						stickTime: stickTime.toString(),
						unstickTime: unstickTime.toString(),
					});

					if (enabled) client.stickyChannelIds.push(channel.id);

					await interaction.reply({
						content: "Message scheduled to stick.",
						ephemeral: true,
					});
				});
		});
	}
}
