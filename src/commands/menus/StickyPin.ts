import { StickyPinnedMessage } from "@/mongo/schemas/StickyPinnedMessage";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordMessageContextMenuCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	EmbedBuilder,
	PermissionFlagsBits,
	type AnyThreadChannel
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
				content: `This channel already has a sticky pinned message: https://discord.com/channels/${interaction.guildId}/${oldRes.channelId}/${oldRes.messageId}`,
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
			if (interaction.targetMessage.pinned)
				await interaction.targetMessage.unpin();
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
				let thread = interaction.guild.channels.cache.filter(x => x.isThread() && x.parent?.id === interaction.channelId && x.name === "Old Pins" && x.ownerId === client.user.id).first() as AnyThreadChannel<boolean> | undefined;
				if (!thread) {
					const embed = new EmbedBuilder().setTitle("Old pins thread")
					thread = await (await interaction.channel?.send({ embeds: [embed] }))?.startThread({ name: "Old Pins" })
				}
				try {
					const targetMessage = (await interaction.channel.messages.fetchPinned(true)).last();
					if (!targetMessage) throw '';
					const embed = new EmbedBuilder()
						.setDescription(targetMessage.content)
						.setAuthor({
							name: targetMessage.author.tag,
							iconURL: targetMessage.author.displayAvatarURL()
						})
					const message = await thread.send({ embeds: [embed] })

					await targetMessage.unpin();
					await targetMessage.reply({
						content: `Messaged unpinned and moved to ${message.url} due to the pin limit`
					});

					if (interaction.targetMessage.pinned)
						await interaction.targetMessage.unpin();
					await interaction.targetMessage.pin();
					interaction.targetMessage.reply({
						content: `Messaged sticky pinned by ${interaction.user}`
					});
					interaction.reply({
						content:
							"Successfully sticky pinned message.",
						ephemeral: true
					});
					return;
				} catch {
					interaction.reply({
						content:
							"Heads up! We've hit the pin limit for this channel. You can unpin some previously pinned messages to free up space.",
						ephemeral: true
					});
					return;
				}

			}

			interaction.reply({
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

		interaction.reply({
			content: "Successfully sticky pinned message.",
			ephemeral: true
		});
	}
}
