import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class EmbedCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("embed")
				.setDescription("Sends or Edits a Message (for mods)")
				.addSubcommand((command) =>
					command
						.setName("send")
						.setDescription("Send an embed")
						.addStringOption((option) =>
							option
								.setName("message_id")
								.setDescription(
									"ID of the message containing the embed (in current channel)",
								)
								.setRequired(true),
						)
						.addChannelOption((option) =>
							option
								.setName("channel")
								.setDescription("Channel to send the embed")
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
				const messageId = interaction.options.getString("message_id", true);

				const message = await interaction.channel.messages.fetch(messageId);

				if (!message) {
					await interaction.reply({
						content: "Message not found",
						ephemeral: true,
					});

					return;
				}

				if (!channel.isTextBased()) {
					await interaction.reply({
						content: "Invalid channel type, must be a text channel.",
						ephemeral: true,
					});

					return;
				}

				await channel.send({
					embeds: message.embeds,
				});

				await interaction.reply({
					content: "Sent successfully",
					ephemeral: true,
				});

				break;
			}

			default:
				break;
		}
	}
}
