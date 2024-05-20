import { StickyPinnedMessage } from "@/mongo/schemas/StickyPinnedMessage";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
    type DiscordMessageContextMenuCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
    ActionRowBuilder,
    ApplicationCommandType,
    ButtonBuilder,
    ButtonStyle,
    ContextMenuCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    TextChannel,
    ThreadChannel,
    type AnyThreadChannel
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

            await interaction.deferReply({
                ephemeral: true,
            })
            if (!interaction.targetMessage.pinned) {
                await interaction.editReply({
                    content: "Message isn't pinned.",
                });

                return;
            }

            let thread = interaction.guild.channels.cache.filter(x => x.isThread() && x.parent?.id === interaction.channelId && x.name === "Old Pins" && x.ownerId === client.user.id).first() as AnyThreadChannel<boolean> | undefined;
            const yesButton = new ButtonBuilder()
                .setCustomId('yes')
                .setLabel('Yes')
                .setStyle(ButtonStyle.Primary)
            const noButton = new ButtonBuilder()
                .setCustomId('no')
                .setLabel('No')
                .setStyle(ButtonStyle.Primary)
            const response = await interaction.editReply({
                content: `Shift to the ${thread?.url || 'old pins'} thread?`,
                components: [new ActionRowBuilder().addComponents(yesButton, noButton) as any],
            })
            try {
                const confirmation = await response.awaitMessageComponent({ time: 60_000 });

                if (confirmation.customId === 'yes') {
                    if (!thread) {
                        const embed = new EmbedBuilder().setTitle("Old pins thread")
                        thread = await (await interaction.channel?.send({ embeds: [embed] }))?.startThread({ name: "Old Pins" })
                    }
                    await StickyPinnedMessage.deleteOne({
                        channelId: interaction.channelId,
                        messageId: interaction.targetMessage.id
                    }).catch(() => null);
                    try {
                        await interaction.targetMessage.unpin();
                        if (thread) {
                            const embed = new EmbedBuilder()
                                .setDescription(interaction.targetMessage.content)
                                .setAuthor({
                                    name: interaction.targetMessage.author.tag,
                                    iconURL: interaction.targetMessage.author.displayAvatarURL()
                                })
                            const message = await thread.send({ embeds: [embed] })

                            await interaction.targetMessage.reply({
                                content: `Messaged unpinned by ${interaction.user} and moved to ${message.url}`
                            });
                        } else
                            await interaction.targetMessage.reply({
                                content: `Messaged unpinned by ${interaction.user}`
                            });
                    } catch (error) {
                        await confirmation.update({ content: "Couldn't unpin message.", components: [] });

                        client.log(
                            error,
                            `${this.data.name} Menu`,
                            `**Channel:** <#${interaction.channel?.id}>
							**User:** <@${interaction.user.id}>
							**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`
                        );
                        return;
                    }
                    await confirmation.update({ content: 'Successfully unpinned message.', components: [] });
                } else if (confirmation.customId === 'no') {
                    await StickyPinnedMessage.deleteOne({
                        channelId: interaction.channelId,
                        messageId: interaction.targetMessage.id
                    }).catch(() => null);
                    try {
                        await interaction.targetMessage.unpin();
                    } catch (error) {
                        await confirmation.update({ content: "Couldn't unpin message.", components: [] });

                        client.log(
                            error,
                            `${this.data.name} Menu`,
                            `**Channel:** <#${interaction.channel?.id}>
							**User:** <@${interaction.user.id}>
							**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`
                        );
                        return;
                    }
                    await confirmation.update({ content: 'Successfully unpinned message.', components: [] });
                }
            } catch (e) {
                await interaction.editReply({ content: 'Did not unpin', components: [] });
            }
        } else {
            if (!interaction.targetMessage.pinnable) {
                await interaction.reply({
                    content: "Message isn't pinnable.",
                    ephemeral: true
                });

                return;
            }

            try {
                await interaction.targetMessage.pin();
                await interaction.targetMessage.reply({
                    content: `Messaged pinned by ${interaction.user}`
                });
            } catch (error) {
                const pinNo = Array.from(
                    (await interaction.channel?.messages.fetchPinned()) || []
                ).length;
                if (pinNo >= 50) {
                    let thread = interaction.guild.channels.cache.filter(x => x.isThread() && x.parent?.id === interaction.channelId && x.name === "Old Pins" && x.ownerId === client.user.id).first() as AnyThreadChannel<boolean> | undefined;
                    if (!thread) {
                        const embed = new EmbedBuilder().setTitle("Old pins thread")
                        thread = await (await interaction.channel?.send({ embeds: [embed] }))?.startThread({ name: "Old Pins" })
                    }
                    await interaction.deferReply({ ephemeral: true })
                    try {
                        const targetMessage = (await interaction.channel?.messages.fetchPinned(true))?.last();
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
                            content: `Messaged pinned by ${interaction.user}`
                        });
                        interaction.editReply({
                            content:
                                "Successfully pinned message.",
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
