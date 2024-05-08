import { StickyPinnedMessage } from "@/mongo/schemas/StickyPinnedMessage";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordMessageContextMenuCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	PermissionFlagsBits,
	TextChannel,
	ThreadChannel
} from "discord.js";

export default class PinMenu extends BaseCommand {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("Toggle Pinned")
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false)
				.setType(ApplicationCommandType.Message)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordMessageContextMenuCommandInteraction<"cached">
	) {
		if (
			!(
				interaction.channel instanceof TextChannel ||
				interaction.channel instanceof ThreadChannel
			)
		) {
			interaction.reply({
				content: "You can't pin/unpin messages in this channel",
				ephemeral: true
			});

			return;
		}

		if (interaction.targetMessage.pinned) {
			await StickyPinnedMessage.deleteOne({
				channelId: interaction.channelId,
				messageId: interaction.targetMessage.id
			}).catch(() => null);

			try {
				await interaction.targetMessage.unpin();
				await interaction.targetMessage.reply({
					content: `Messaged unpinned by ${interaction.user}`
				});
			} catch (error) {
				await interaction.reply({
					content: "Couldn't unpin message.",
					ephemeral: true
				});

				client.log(
					error,
					`${this.data.name} Menu`,
					`**Channel:** <#${interaction.channel?.id}>
						**User:** <@${interaction.user.id}>
						**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`
				);
			}

			await interaction.reply({
				content: "Successfully unpinned message.",
				ephemeral: true
			});
		} else {
			if (!interaction.targetMessage.pinnable) {
				await interaction.reply({
					content: "Message isn't pinnable.",
					ephemeral: true
				});

				return;
			}

			const res = await StickyPinnedMessage.findOne({
				channelId: interaction.channel.id
			});

			try {
				await interaction.targetMessage.pin();
				if (res) {
					await interaction.channel.messages.unpin(res.messageId);
					await interaction.channel.messages.pin(res.messageId);
				}
				await interaction.targetMessage.reply({
					content: `Messaged pinned by ${interaction.user}`
				});
			} catch (error) {
				const pinNo = Array.from(
					(await interaction.channel?.messages.fetchPinned()) || []
				).length;
				if (pinNo >= 50) {
					await interaction.reply({
						content:
							"Heads up! We've hit the pin limit for this channel. You can unpin some previously pinned messages to free up space."
					});
					return;
				}

				await interaction.reply({
					content: "Couldn't pin message.",
					ephemeral: true
				});

				client.log(
					error,
					`${this.data.name} Menu`,
					`**Channel:** <#${interaction.channel?.id}>
					**User:** <@${interaction.user.id}>
					**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`
				);
			}

			await interaction.reply({
				content: "Successfully pinned message.",
				ephemeral: true
			});
		}
	}
}
