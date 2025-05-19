import { OldPinsThread } from "@/mongo/schemas/OldPinsThread";
import { StickyPinnedMessage } from "@/mongo/schemas/StickyPinnedMessage";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordMessageContextMenuCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	type AnyThreadChannel,
	ApplicationCommandType,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContextMenuCommandBuilder,
	EmbedBuilder,
	PermissionFlagsBits,
	TextChannel,
	ThreadChannel,
} from "discord.js";

export default class PinMenu extends BaseCommand {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("Toggle Pinned")
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false)
				.setType(ApplicationCommandType.Message),
		);
	}

	async handleStickyAndRespond(
		toggleInteraction: DiscordMessageContextMenuCommandInteraction<"cached">
	) {
		if (!toggleInteraction.channel) {
			return;
		};
		const stickyPinData = await StickyPinnedMessage.findOne({
			channelId: toggleInteraction.channelId,
		});

		if (stickyPinData) {
			const stickyPin = await toggleInteraction.channel.messages.fetch(stickyPinData.messageId);
			try {
				await stickyPin.unpin();
			} catch {
				await toggleInteraction.targetMessage.reply({
					content: `Messaged pinned by ${toggleInteraction.user}`,
				});
				await toggleInteraction.followUp({
					content: `Couldn't bring sticky pin to the top. Sticky pin: ${stickyPin.url}`,
					flags: 64,
				});
				return;
			}

			try {
				await stickyPin.pin();
			} catch {
				await toggleInteraction.targetMessage.reply({
					content: `Messaged pinned by ${toggleInteraction.user}`,
				});
				await toggleInteraction.followUp({
					content: `Couldn't re-pin the sticky pin. Sticky pin: ${stickyPin.url}`,
					flags: 64,
				});
				return;
			}
			await toggleInteraction.targetMessage.reply({
				content: `Messaged pinned by ${toggleInteraction.user} ||(& sticky pin moved to top)||`,
			});
		} else {
			await toggleInteraction.targetMessage.reply({
				content: `Messaged pinned by ${toggleInteraction.user}`,
			});
		}
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordMessageContextMenuCommandInteraction<"cached">,
	) {
		if (
			!(
				interaction.channel instanceof TextChannel ||
				interaction.channel instanceof ThreadChannel
			)
		) {
			interaction.reply({
				content: "You can't pin/unpin messages in this channel",
				flags: 64,
			});

			return;
		}

		if (interaction.targetMessage.pinned) {
			// Unpin Message
			await interaction.deferReply({
				flags: 64,
			});

			let thread = interaction.guild.channels.cache
				.filter(
					(x) =>
						x?.isThread() &&
						x?.parent?.id === interaction.channelId &&
						x?.name === "Old Pins" &&
						x?.ownerId === client.user.id,
				)
				.first() as AnyThreadChannel | undefined;
			const yesButton = new ButtonBuilder()
				.setCustomId("yes")
				.setLabel("Yes")
				.setStyle(ButtonStyle.Primary);
			const noButton = new ButtonBuilder()
				.setCustomId("no")
				.setLabel("No")
				.setStyle(ButtonStyle.Primary);
			const response = await interaction.editReply({
				content: `Shift to the ${thread?.url || "old pins"} thread?`,
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						yesButton,
						noButton,
					),
				],
			});
			try {
				const confirmation = await response.awaitMessageComponent({
					time: 60_000,
				});

				if (confirmation.customId === "yes") {
					if (!thread) {
						const embed = new EmbedBuilder().setTitle(
							"Old pins thread",
						);
						thread = await (
							await interaction.channel?.send({ embeds: [embed] })
						)?.startThread({ name: "Old Pins" });
					}
					await StickyPinnedMessage.deleteOne({
						channelId: interaction.channelId,
						messageId: interaction.targetMessage.id,
					}).catch(() => null);
					try {
						await interaction.targetMessage.unpin();
						if (thread) {
							let embed = new EmbedBuilder().setAuthor({
								name: interaction.targetMessage.author.tag,
								iconURL:
									interaction.targetMessage.author.displayAvatarURL(),
							});
							if (interaction.targetMessage.content)
								embed = embed.setDescription(
									interaction.targetMessage.content,
								);
							const files = [];
							for (const file of interaction.targetMessage.attachments.toJSON()) {
								const buffer = Buffer.from(
									await (await fetch(file.url)).arrayBuffer(),
								);
								if (buffer)
									files.push(
										new AttachmentBuilder(buffer, {
											name: file.name,
											description:
												file.description || undefined,
										}),
									);
							}
							const message = await thread.send({
								embeds: [embed],
								files,
							});
							if (!thread.locked) await thread.setLocked(true);
							await interaction.targetMessage.reply({
								content: `Messaged unpinned by ${interaction.user} and moved to ${message.url}`,
							});
						} else
							await interaction.targetMessage.reply({
								content: `Messaged unpinned by ${interaction.user}`,
							});
					} catch (error) {
						await confirmation.update({
							content: "Couldn't unpin message.",
							components: [],
						});

						client.log(
							error,
							`${this.data.name} Menu`,
							`**Channel:** <#${interaction.channel?.id}>
							**User:** <@${interaction.user.id}>
							**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
						);
						return;
					}
					await confirmation.update({
						content: "Successfully unpinned message.",
						components: [],
					});
				} else if (confirmation.customId === "no") {
					await StickyPinnedMessage.deleteOne({
						channelId: interaction.channelId,
						messageId: interaction.targetMessage.id,
					}).catch(() => null);
					try {
						await interaction.targetMessage.unpin();
						interaction.targetMessage.reply({
							content: `Messaged unpinned by ${interaction.user}`,
						});
					} catch (error) {
						await confirmation.update({
							content: "Couldn't unpin message.",
							components: [],
						});

						client.log(
							error,
							`${this.data.name} Menu`,
							`**Channel:** <#${interaction.channel?.id}>
							**User:** <@${interaction.user.id}>
							**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
						);
						return;
					}
					await confirmation.update({
						content: "Successfully unpinned message.",
						components: [],
					});
				}
			} catch (e) {
				console.error(e);
				await interaction.editReply({
					content: "Did not unpin",
					components: [],
				});
			}
		} else {
			// Pin Message
			if (!interaction.targetMessage.pinnable) {
				await interaction.reply({
					content: "Message isn't pinnable.",
					flags: 64,
				});

				return;
			}

			try {
				await interaction.targetMessage.pin();
				await this.handleStickyAndRespond(interaction);
			} catch (error) {
				const pinNo = Array.from(
					(await interaction.channel?.messages.fetchPinned()) || [],
				).length;
				if (pinNo >= 50) {
					// Shift to Old Pins if possible
					const channel = interaction.channel.isThread()
						? interaction.channel.parent
						: interaction.channel;
					let thread = (await channel?.threads.fetch())?.threads
						.filter(
							(x) =>
								x.isThread() &&
								x.parent?.id === interaction.channelId &&
								x.name === "Old Pins" &&
								x.ownerId === client.user.id,
						)
						.first() as AnyThreadChannel | undefined;
					if (!thread) {
						thread = (
							await channel?.threads.fetchArchived()
						)?.threads
							.filter(
								(x) =>
									x.isThread() &&
									x.parent?.id === interaction.channelId &&
									x.name === "Old Pins" &&
									x.ownerId === client.user.id,
							)
							.first() as AnyThreadChannel | undefined;
					}
					if (!thread) {
						const threadId = (
							await OldPinsThread.find({
								channelId: interaction.channelId,
							}).exec()
						)?.[0]?.oldPinsThreadId;
						console.log(threadId);
						if (threadId)
							thread = (
								await channel?.threads.fetchArchived()
							)?.threads.get(threadId) as
								| AnyThreadChannel
								| undefined;
					}
					if (!thread) {
						const embed = new EmbedBuilder().setTitle(
							"Old pins thread",
						);
						thread = await (
							await interaction.channel?.send({ embeds: [embed] })
						)?.startThread({ name: "Old Pins" });
					}

					await interaction.deferReply({ ephemeral: true });
					try {
						const targetMessage = (
							await interaction.channel?.messages.fetchPinned(
								true,
							)
						)?.last();
						if (!targetMessage) throw "";
						const embed = new EmbedBuilder()
							.setDescription(targetMessage.content)
							.setAuthor({
								name: targetMessage.author.tag,
								iconURL:
									targetMessage.author.displayAvatarURL(),
							});
						const files = [];
						for (const file of targetMessage.attachments.toJSON()) {
							const buffer = Buffer.from(
								await (await fetch(file.url)).arrayBuffer(),
							);
							if (buffer)
								files.push(
									new AttachmentBuilder(buffer, {
										name: file.name,
										description:
											file.description || undefined,
									}),
								);
						}

						const message = await thread.send({
							embeds: [embed],
							files,
						});
						if (!thread.locked) await thread.setLocked(true);
						await targetMessage.unpin();
						await targetMessage.reply({
							content: `Messaged unpinned and moved to ${message.url} due to the pin limit`,
						});

						if (interaction.targetMessage.pinned)
							await interaction.targetMessage.unpin();
						await interaction.targetMessage.pin();
						await this.handleStickyAndRespond(interaction);
						interaction.editReply({
							content: "Successfully pinned message.",
						});
						return;
					} catch {
						interaction.editReply({
							content:
								"Heads up! We've hit the pin limit for this channel. You can unpin some previously pinned messages to free up space.",
						});
						return;
					}
				}

				await interaction.reply({
					content: "Couldn't pin message.",
					flags: 64,
				});

				client.log(
					error,
					`${this.data.name} Menu`,
					`**Channel:** <#${interaction.channel?.id}>
					**User:** <@${interaction.user.id}>
					**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
				);
			}

			await interaction.reply({
				content: "Successfully pinned message.",
				flags: 64,
			});
		}
	}
}
