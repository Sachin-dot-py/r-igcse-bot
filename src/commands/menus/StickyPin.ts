import { StickyPinnedMessage } from "@/mongo/schemas/StickyPinnedMessage";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordMessageContextMenuCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	type AnyThreadChannel,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ContextMenuCommandBuilder,
	EmbedBuilder,
	PermissionFlagsBits,
} from "discord.js";

export default class StickMessageCommand extends BaseCommand {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("Stick Message to Pins")
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

		await interaction.deferReply({ephemeral: true,})

		const oldRes = await StickyPinnedMessage.findOne({
			channelId: interaction.channel.id,
		});
		
		if (oldRes) {
			const yesButton = new ButtonBuilder()
							.setCustomId("yes")
							.setLabel("Yes")
							.setStyle(ButtonStyle.Success);
			const noButton = new ButtonBuilder()
				.setCustomId("no")
				.setLabel("No")
				.setStyle(ButtonStyle.Danger);

			if (oldRes.messageId !== interaction.targetMessage.id) {
				const response = await interaction.editReply({
					content: `Override old sticky pin? https://discord.com/channels/${interaction.guildId}/${oldRes.channelId}/${oldRes.messageId}`,
					components: [
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							yesButton,
							noButton,
						),
					],
				});

				const confirmation = await response.awaitMessageComponent({
					time: 60_000,
				});

				if (confirmation.customId === "no") {
					await confirmation.update({
						content: "Cancelled.",
						components: [],
					});
					return;
				} else if (confirmation.customId !== "yes") {
					return;
				}
			} else {
				const response = await interaction.editReply({
					content: `This message is already sticky pinned. Would you like to remove it as a sticky pin (while still keeping it as a regular pin)?`,
					components: [
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							yesButton,
							noButton,
						),
					],
				});

				const confirmation = await response.awaitMessageComponent({
					time: 60_000,
				});

				if (confirmation.customId === "no") {
					await confirmation.update({
						content: "Cancelled.",
						components: [],
					});
				} else if (confirmation.customId === "yes") {
					await oldRes.deleteOne();
					await confirmation.update({
						content: "This is no longer a sticky pin.",
						components: [],
					});
				}
				return;
			}
		}

		const res = await StickyPinnedMessage.updateOne(
			{
			  channelId: interaction.channel.id,
			},
			{
			  $set: {
				messageId: interaction.targetMessage.id,
			  },
			},
			{ upsert: true }
		  );

		if (!res) {
			interaction.followUp({
				content: "Failed to create sticky pinned message.",
				ephemeral: true,
			});
			return;
		}

		try {
			if (interaction.targetMessage.pinned)
				await interaction.targetMessage.unpin();
			interaction.targetMessage.pin();

			interaction.targetMessage.reply({
				content: `Messaged sticky pinned by ${interaction.user}`,
			});
			interaction.editReply({
				content: "Successfully sticky pinned message.",
				components: [],
			});
		} catch (error) {
			await StickyPinnedMessage.deleteOne({ channelId: interaction.channel.id });
			const pinnedMessages = (
				await interaction.channel.messages.fetchPinned()
			).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

			if (pinnedMessages.size >= 50) {
				let thread = interaction.guild.channels.cache
					.filter(
						(x) =>
							x.isThread() &&
							x.parent?.id === interaction.channelId &&
							x.name === "Old Pins" &&
							x.ownerId === client.user.id,
					)
					.first() as AnyThreadChannel | undefined;
				if (!thread) {
					const embed = new EmbedBuilder().setTitle(
						"Old pins thread",
					);
					thread = await (
						await interaction.channel?.send({ embeds: [embed] })
					)?.startThread({ name: "Old Pins" });
				}
				try {
					const targetMessage = (
						await interaction.channel.messages.fetchPinned(true)
					).last();
					if (!targetMessage) throw "";
					const embed = new EmbedBuilder()
						.setDescription(targetMessage.content)
						.setAuthor({
							name: targetMessage.author.tag,
							iconURL: targetMessage.author.displayAvatarURL(),
						});
					const message = await thread.send({ embeds: [embed] });

					await targetMessage.unpin();
					await targetMessage.reply({
						content: `Messaged unpinned and moved to ${message.url} due to the pin limit`,
					});

					if (interaction.targetMessage.pinned)
						await interaction.targetMessage.unpin();
					await interaction.targetMessage.pin();
					interaction.targetMessage.reply({
						content: `Messaged sticky pinned by ${interaction.user}`,
					});
					interaction.editReply({
						content: "Successfully sticky pinned message.",
						components: [],
					});
					return;
				} catch {
					interaction.editReply({
						content:
							"Heads up! We've hit the pin limit for this channel. You can unpin some previously pinned messages to free up space.",
						components: [],
					});
					return;
				}
			}

			interaction.editReply({
				content: "Couldn't pin message.",
				components: [],
			});

			client.log(
				error,
				`${this.data.name} Menu`,
				`**Channel:** <#${interaction.channel?.id}>
					**User:** <@${interaction.user.id}>
					**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
			);
		}
	}
}
