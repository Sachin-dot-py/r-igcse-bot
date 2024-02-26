import { StickyMessage } from "@/mongo";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/client";
import { SlashCommandBuilder } from "discord.js";

export default class StickMessageCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("stick_message")
				.setDescription("Sticks a message to a channel. Can be done in advance")
				// .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false)
				.addStringOption((option) =>
					option
						.setName("message_id")
						.setDescription(
							"The message to stick (must be in the current channel)",
						)
						.setRequired(true),
				)
				.addChannelOption((option) =>
					option
						.setName("channel")
						.setDescription("The channel to stick the message to")
						.setRequired(false),
				)
				.addIntegerOption((option) =>
					option
						.setName("stick_time")
						.setDescription("Message Auto-Stick Time (Epoch)")
						.setRequired(false),
				)
				.addIntegerOption((option) =>
					option
						.setName("unstick_time")
						.setDescription("Message Auto-Unstick Time (Epoch)")
						.setRequired(false),
				),
		);
	}

	// TODO: Logging
	async execute(
		interaction: DiscordChatInputCommandInteraction,
		client: DiscordClient,
	) {
		if (
			!interaction.inGuild() ||
			!interaction.channel ||
			!interaction.channel.isTextBased()
		)
			return;

		const time = Date.now();

		const messageId = interaction.options.getString("message_id", true);
		const channel =
			interaction.options.getChannel("channel", false) || interaction.channel;

		const stickTime =
			interaction.options.getInteger("stick_time", false) || time;
		const unstickTime =
			interaction.options.getInteger("unstick_time", false) || time + 2592000;

		if (stickTime > unstickTime) {
			await interaction.reply({
				content: "Stick time must be before unstick time.",
				ephemeral: true,
			});

			return;
		}

		if (unstickTime < time) {
			await interaction.reply({
				content: "Unstick time must be before now.",
				ephemeral: true,
			});

			return;
		}

		const message = await interaction.channel.messages.fetch(messageId);

		if (!message) {
			await interaction.reply({
				content: "Message not found.",
				ephemeral: true,
			});

			return;
		}

		const embeds = message.embeds;

		if (embeds.length < 1) {
			interaction.reply({
				content: "This message does not have any embeds.",
				ephemeral: true,
			});

			return;
		}

		const embed = embeds[0];
		const enabled = stickTime <= time && unstickTime > time;

		await StickyMessage.create({
			channelId: channel.id,
			messageId: null,
			embed: embed.toJSON(),
			stickTime,
			unstickTime,
		});

		if (enabled) client.stickyChannelIds.push(channel.id);

		await interaction.reply({
			content: "Message scheduled to stick.",
			ephemeral: true,
		});
	}
}
