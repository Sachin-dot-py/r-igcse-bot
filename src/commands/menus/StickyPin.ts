import { StickyPinnedMessage } from "@/mongo/schemas/StickyPinnedMessage";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordMessageContextMenuCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	PermissionFlagsBits
} from "discord.js";

export default class StickMessageCommand extends BaseCommand {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("Stick Message to Pins")
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false)
				.setType(ApplicationCommandType.Message)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordMessageContextMenuCommandInteraction<"cached">
	) {
		if (!interaction.channel) return;

		const oldRes = await StickyPinnedMessage.findOne({
			channelId: interaction.channel.id
		});

		if (oldRes) {
			interaction.reply({
				content: `This channel already has a sticky pinned message: https://discord.com/channels/${interaction.guildId}/${oldRes.channelId}/${oldRes.messageId}}`,
				ephemeral: true
			});

			return;
		}

		const res = await StickyPinnedMessage.create({
			channelId: interaction.channel.id,
			messageId: interaction.targetMessage.id
		});

		if (!res) {
			interaction.followUp({
				content: "Failed to create sticky pinned message.",
				ephemeral: true
			});

			return;
		}

		try {
			interaction.targetMessage.pin();

			interaction.targetMessage.reply({
				content: `Messaged sticky pinned by ${interaction.user}`
			});
		} catch (error) {
			res.deleteOne();

			const pinnedMessages = (
				await interaction.channel.messages.fetchPinned()
			).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

			if (pinnedMessages.size >= 50) {
				interaction.reply({
					content:
						"Heads up! We've hit the pin limit for this channel. You can unpin some previously pinned messages to free up space."
				});

				return;
			}

			interaction.reply({
				content: "Couldn't pin message.",
				ephemeral: true
			});
		}
	}
}
