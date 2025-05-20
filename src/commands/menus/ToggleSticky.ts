import { StickyMessage } from "@/mongo";
import { StickyMessageCache } from "@/redis";
import type {
	APIEmbedRedis,
	ICachedStickyMessage,
} from "@/redis/schemas/StickyMessage";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordMessageContextMenuCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	ApplicationCommandType,
	ChannelSelectMenuBuilder,
	ChannelType,
	ComponentType,
	ContextMenuCommandBuilder,
	ModalBuilder,
	PermissionFlagsBits,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { EntityId } from "redis-om";

export default class StickMessageCommand extends BaseCommand {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("Toggle Sticky Message")
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false)
				.setType(ApplicationCommandType.Message),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordMessageContextMenuCommandInteraction<"cached">,
	) {
		if (!interaction.channel) return;

		const stickyCheck = (await StickyMessageCache.search()
			.where("messageId")
			.equals(interaction.targetId)
			.returnAll()) as ICachedStickyMessage[];

		console.log(stickyCheck);

		if (
			!stickyCheck ||
			stickyCheck.length < 1 ||
			!stickyCheck[0][EntityId]
		) {
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
				.setTitle("Stick Message (Times are optional)")
				.setCustomId("stick-message")
				.addComponents(row1, row2);
			await interaction.showModal(modal);

			const modalInteraction = await interaction.awaitModalSubmit({
				filter: (i) =>
					i.user.id === interaction.user.id &&
					i.customId === "stick-message",
				time: 90000,
			});

			await modalInteraction.deferUpdate();

			const stickTime =
				Number.parseInt(
					modalInteraction.fields.getTextInputValue("stick-time"),
				) || null;
			const unstickTime =
				Number.parseInt(
					modalInteraction.fields.getTextInputValue("unstick-time"),
				) || null;

			if (stickTime && unstickTime) {
				if (stickTime > unstickTime) {
					await interaction.followUp({
						content: "Stick time must be before unstick time.",
						ephemeral: true,
					});

					return;
				}
				if (unstickTime < time) {
					await interaction.followUp({
						content: "Unstick time must be after now.",
						ephemeral: true,
					});

					return;
				}
			}

			const channelSelect = new ChannelSelectMenuBuilder()
				.setCustomId("stick-channel")
				.setPlaceholder("Select a channel")
				.setMaxValues(1)
				.setMinValues(1)
				.setChannelTypes(
					ChannelType.GuildText,
					ChannelType.PublicThread,
					ChannelType.PrivateThread,
					ChannelType.GuildStageVoice,
				);

			const channelRow =
				new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
					channelSelect,
				);

			const interactionRes = await interaction.followUp({
				components: [channelRow],
				ephemeral: true,
			});

			const selectInteraction =
				await interactionRes.awaitMessageComponent({
					componentType: ComponentType.ChannelSelect,
					filter: (i) =>
						i.user.id === interaction.user.id &&
						i.customId === "stick-channel",
					time: 60000,
				});

			await selectInteraction.deferUpdate();

			const channelId = selectInteraction.values[0];
			const channel = interaction.guild.channels.cache.get(channelId);
			if (!channel || !channel.isTextBased()) {
				await interaction.followUp({
					content: "Channel not found / Invalid channel type",
					ephemeral: true,
				});

				return;
			}

			const res = await StickyMessage.create({
				channelId: channel.id,
				messageId: null,
				message: {
					content: interaction.targetMessage.content,
					embeds: interaction.targetMessage.embeds.map((embed) =>
						embed.toJSON(),
					),
				},
				stickTime: stickTime?.toString(),
				unstickTime: unstickTime?.toString(),
			});

			if (!res) {
				await interaction.followUp({
					content: "Failed to create sticky message.",
					ephemeral: true,
				});

				return;
			}

			if (!unstickTime && !stickTime) {
				await StickyMessageCache.set(res.id, {
					channelId: channel.id,
					messageId: null,
					message: {
						content: interaction.targetMessage.content,
						embeds: interaction.targetMessage.embeds.map((embed) =>
							embed.toJSON(),
						) as APIEmbedRedis[],
					},
				});

				client.stickyChannelIds.push(channel.id);
			}

			await interaction.followUp({
				content: "Message scheduled to stick.",
				ephemeral: true,
			});
		} else {
			await StickyMessageCache.remove(stickyCheck[0][EntityId]);
			await StickyMessage.deleteOne({ _id: stickyCheck[0][EntityId] });

			await interaction.reply({
				content: "Successfully unstuck message.",
				ephemeral: true,
			});
		}
	}
}
