import { ActionRowBuilder, ButtonBuilder, Colors, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuOptionBuilder, type InteractionReplyOptions } from "discord.js";
import BaseCommand, {
    type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";
import { ScheduledMessage } from "@/mongo/schemas/ScheduledMessage";
import Pagination from "@/components/Pagination";
import { ChannelLockdown } from "@/mongo/schemas/ChannelLockdown";
import Logger from "@/utils/Logger";
import { GuildPreferencesCache } from "@/redis";
import { v4 as uuidv4 } from "uuid";
import Select from "@/components/Select";
import Buttons from "@/components/practice/views/Buttons";
import humanizeDuration from "humanize-duration";

export default class ScheduledCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("scheduled")
                .setDescription("Scheduled things")
                .addSubcommandGroup((group) =>
                    group
                        .setName("list")
                        .setDescription("List previously scheduled things")
                        .addSubcommand((command) =>
                            command
                                .setName("messages")
                                .setDescription("View previously scheduled messages/embeds")
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("lockdowns")
                                .setDescription("View previously scheduled channel lockdowns")
                        ))
                .addSubcommandGroup((group) =>
                    group
                        .setName("delete")
                        .setDescription("Unschedule things")
                        .addSubcommand((command) =>
                            command
                                .setName("message")
                                .setDescription("Unschedule a message or embed")
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("lockdown")
                                .setDescription("Unschedule a channel lockdown")
                        ))
                .setDMPermission(false)
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction<"cached">
    ) {
        switch (interaction.options.getSubcommandGroup()) {
            case ("list"): {
                switch (interaction.options.getSubcommand()) {
                    case ("messages"): {
                        const messages = await ScheduledMessage.find({
                            guildId: interaction.guildId
                        });

                        if (!messages) {
                            interaction.reply({
                                content: "There are no scheduled messages or embeds",
                                ephemeral: true
                            });

                            return;
                        }

                        await interaction.reply({
                            content: "The following messages and embeds were found",
                            ephemeral: true
                        })

                        messages.forEach(async (doc) => {
                            await interaction.followUp({
                                content: `Message to be sent <t:${doc.scheduleTime}:R>:\n\`\`\`${doc.message.content}\n\`\`\``,
                                embeds: doc.message.embeds,
                                ephemeral: true
                            });
                        });

                        break;
                    }
                    case ("lockdowns"): {
                        const lockdowns = await ChannelLockdown.find({
                            guildId: interaction.guildId!
                        })

                        if (!lockdowns || lockdowns.length === 0) {
                            interaction.reply({
                                content: "There are no channels scheduled to be locked",
                                ephemeral: true
                            });

                            return;
                        }

                        const chunks = Array.from(
                            { length: Math.ceil(lockdowns.length / 5) },
                            (_, i) => lockdowns.slice(i * 5, i * 5 + 5)
                        );

                        const paginator = new Pagination(chunks, async (chunk) => {
                            const embed = new EmbedBuilder()
                                .setTitle("Scheduled Lockdowns")
                                .setColor(Colors.Blurple)
                                .setDescription(
                                    `Page ${chunks.indexOf(chunk) + 1} of ${chunks.length}`
                                );

                            for (const { startTimestamp, channelId } of chunk)
                                embed.addFields({ name: `${interaction.guild.channels.cache.get(channelId)?.name} <t:${parseFloat(startTimestamp).toFixed(0)}:R>`, value: "\n", inline: false });

                            return { embeds: [embed] };
                        });

                        await paginator.start({
                            interaction,
                            ephemeral: false
                        });
                    }
                }
                break;
            }
            case ("delete"): {
                await interaction.deferReply({
                    fetchReply: true,
                    ephemeral: true
                });

                switch (interaction.options.getSubcommand()) {
                    case ("message"): {
                        const options = await ScheduledMessage.find({
                            guildId: interaction.guildId!
                        });

                        if (!options) {
                            interaction.editReply({
                                content: "There are no scheduled message or embeds"
                            });

                            return;
                        }

                        const selectCustomId = uuidv4();

                        const optionSelect = new Select(
                            "message",
                            "Select the message/embed you want to unschedule",
                            options.map(({ id, scheduleTime, channelId }) => {
                                const channel = interaction.guild?.channels.cache.get(channelId);
                                return new StringSelectMenuOptionBuilder()
                                    .setLabel(
                                        `#${channel?.name} | in ${humanizeDuration(
                                            (parseInt(scheduleTime) * 1000) - Date.now(),
                                            { round: true, largest: 2 }
                                        )}`
                                    )
                                    .setValue(id)
                            }),
                            1,
                            `${selectCustomId}_0`
                        );

                        const selectInteraction = await interaction.editReply({
                            content: "Select a message/embed to unschedule",
                            components: [
                                new ActionRowBuilder<Select>().addComponents(optionSelect),
                                new Buttons(selectCustomId) as ActionRowBuilder<ButtonBuilder>
                            ]
                        });

                        const response = await optionSelect.waitForResponse(
                            `${selectCustomId}_0`,
                            selectInteraction,
                            interaction,
                            true
                        );

                        if (!response || response === "Timed out" || !response[0]) {
                            await interaction.followUp({
                                content: "An error occurred",
                                ephemeral: false
                            });
                            return;
                        }

                        const doc = await ScheduledMessage.findById(response[0]);

                        if (!doc) {
                            interaction.editReply({
                                content: "Couldn't find message to be unschedule",
                                components: []
                            });

                            return;
                        }

                        await doc.deleteOne();

                        interaction.editReply({
                            content: doc.message.content ?
                                `Successfully unscheduled the following message from being sent <t:${doc.scheduleTime}:R> in <#${doc.channelId}>: \n \`\`\`\n${doc.message.content}\`\`\`` :
                                `Successfully unscheduled the following embed from being sent <t:${doc.scheduleTime}:R> in <#${doc.channelId}>:`,
                            embeds: doc.message.embeds,
                            components: []
                        });
                        const guildPreferences = await GuildPreferencesCache.get(
                            interaction.guildId!
                        );

                        if (
                            !guildPreferences ||
                            !guildPreferences.generalLogsChannelId
                        ) {
                            interaction.editReply({
                                content:
                                    "Please setup the bot using the command `/setup` first.",
                                components: []
                            });
                            return;
                        }

                        await Logger.channel(
                            interaction.guild!,
                            guildPreferences.generalLogsChannelId,
                            {
                                embeds: [
                                    new EmbedBuilder()
                                        .setTitle("Message Unscheduled")
                                        .setDescription(
                                            `Message unscheduled by ${interaction.user.tag} (<@${interaction.user.id}>) in <#${doc.channelId}>`
                                        )
                                        .setColor("Red")
                                        .setTimestamp()
                                ]
                            }
                        ).catch(() => {
                            interaction.followUp({
                                content: "Invalid log channel, contact admins",
                                ephemeral: true
                            });
                        });

                        break;
                    }
                    case ("lockdown"): {
                        const options = await ChannelLockdown.find({
                            guildId: interaction.guildId!
                        });

                        if (!options) {
                            interaction.editReply({
                                content: "There are no scheduled channel lockdowns"
                            });

                            return;
                        }

                        const selectCustomId = uuidv4();

                        const optionSelect = new Select(
                            "lockdown",
                            "Select the channel lockdown you want to unschedule",
                            options.map(({ id, startTimestamp, channelId }) => {
                                const channel = interaction.guild?.channels.cache.get(channelId);
                                return new StringSelectMenuOptionBuilder()
                                    .setLabel(
                                        `#${channel?.name} | in ${humanizeDuration(
                                            (parseInt(startTimestamp) * 1000) - Date.now(),
                                            { round: true, largest: 2 }
                                        )}`
                                    )
                                    .setValue(id)
                            }),
                            1,
                            `${selectCustomId}_0`
                        );

                        const selectInteraction = await interaction.editReply({
                            content: "Select a channel lockdown to unschedule",
                            components: [
                                new ActionRowBuilder<Select>().addComponents(optionSelect),
                                new Buttons(selectCustomId) as ActionRowBuilder<ButtonBuilder>
                            ]
                        });

                        const response = await optionSelect.waitForResponse(
                            `${selectCustomId}_0`,
                            selectInteraction,
                            interaction,
                            true
                        );

                        if (!response || response === "Timed out" || !response[0]) {
                            await interaction.followUp({
                                content: "An error occurred",
                                ephemeral: false
                            });
                            return;
                        }

                        const doc = await ChannelLockdown.findById(response[0]);

                        if (!doc) {
                            interaction.editReply({
                                content: "Couldn't find lockdown to be unschedule",
                                components: []
                            });

                            return;
                        }

                        await doc.deleteOne();

                        interaction.editReply({
                            content: `Unscheduled ${interaction.guild?.channels.cache.get(doc.channelId)} from being locked <t:${parseFloat(doc.startTimestamp).toFixed(0)}:R>`,
                            components: []
                        });

                        const guildPreferences = await GuildPreferencesCache.get(
                            interaction.guildId!
                        );

                        if (
                            !guildPreferences ||
                            !guildPreferences.generalLogsChannelId
                        ) {
                            interaction.editReply({
                                content:
                                    "Please setup the bot using the command `/setup` first.",
                                components: []
                            });
                            return;
                        }

                        await Logger.channel(
                            interaction.guild!,
                            guildPreferences.generalLogsChannelId,
                            {
                                embeds: [
                                    new EmbedBuilder()
                                        .setTitle("Channel Lockdown Unscheduled")
                                        .setDescription(
                                            `Channel Lockdown Unscheduled by ${interaction.user.tag} (<@${interaction.user.id}>) in <#${doc.channelId}>`
                                        )
                                        .setColor("Red")
                                        .setTimestamp()
                                ]
                            }
                        ).catch(() => {
                            interaction.followUp({
                                content: "Invalid log channel, contact admins",
                                ephemeral: true
                            });
                        });

                        break;
                    }
                }
            }
        }
    }

}

