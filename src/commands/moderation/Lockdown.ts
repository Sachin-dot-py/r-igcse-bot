import { ChannelLockdown } from "@/mongo/schemas/ChannelLockdown";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
    type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
    ChannelType,
    PermissionFlagsBits,
    SlashCommandBuilder,
    ButtonBuilder,
    ButtonStyle,
} from "discord.js";
import { GuildPreferencesCache } from "@/redis";
import humanizeDuration from "humanize-duration";
export default class LockdownCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("lockdown")
                .setDescription("Lockdown related commands")
                .addSubcommand(sub =>
                    sub
                        .setName("create")
                        .setDescription("Lockdown a channel")
                        .addChannelOption(option =>
                            option
                                .setName("channel")
                                .setDescription("Channel to lockdown")
                                .setRequired(true)
                                .addChannelTypes(
                                    ChannelType.GuildText,
                                    ChannelType.PublicThread,
                                    ChannelType.GuildForum,
                                    ChannelType.PrivateThread,
                                )
                        )
                        .addIntegerOption(option =>
                            option
                                .setName("lock")
                                .setDescription("Epoch time to lock the channel (defaults to now)")
                        )
                        .addIntegerOption(option =>
                            option
                                .setName("unlock")
                                .setDescription("Epoch time to unlock the channel (defaults to 1 day)")
                        )
                )
                .addSubcommand(sub =>
                    sub
                        .setName("remove")
                        .setDescription("Remove lockdown from a channel")
                        .addChannelOption(option =>
                            option
                                .setName("channel")
                                .setDescription("Channel to unlock and remove lockdown record")
                                .setRequired(true)
                                .addChannelTypes(
                                    ChannelType.GuildText,
                                    ChannelType.PublicThread,
                                    ChannelType.GuildForum,
                                    ChannelType.PrivateThread,
                                )
                        )
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
                .setDMPermission(false)
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction<"cached">,
    ) {
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: true, });

        switch (interaction.options.getSubcommand()) {
            case "create": {
                const channel = interaction.options.getChannel("channel", true, [
                    ChannelType.GuildText,
                    ChannelType.PublicThread,
                    ChannelType.GuildForum,
                    ChannelType.PrivateThread,
                ]);
                const lockEpoch = interaction.options.getInteger("lock", false);
                const unlockEpoch = interaction.options.getInteger("unlock", false);

                const now = Math.floor(Date.now() / 1000);
                const lockTime = lockEpoch || now;
                const unlockTime = unlockEpoch || now + 86400;
                const lockDuration = unlockTime - lockTime;

                let isLocked = false;
                if (
                    channel.type === ChannelType.GuildText ||
                    channel.type === ChannelType.GuildForum
                ) {
                    const perms = channel.permissionsFor(interaction.guild.roles.everyone);
                    isLocked = perms && !perms.has("SendMessages");
                } else if (
                    channel.type === ChannelType.PublicThread ||
                    channel.type === ChannelType.PrivateThread
                ) {
                    isLocked = channel.locked ?? false;
                }
                if (isLocked) {
                    await interaction.editReply({
                        content: "This channel is already locked. please run `/lockdown remove` to remove lockdown .",
                    });
                    return;
                }

                const existing = await ChannelLockdown.findOne({
                    guildId: interaction.guildId,
                    channelId: channel.id,
                });

                if (existing && existing.locked) {
                    await interaction.editReply({
                        content: "This channel is already locked (DB record).",
                    });
                    return;
                }

                if (existing && !existing.locked) {
                    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import("discord.js");
                    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId("lockdown_overwrite_yes")
                            .setLabel("Yes, overwrite")
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId("lockdown_overwrite_no")
                            .setLabel("No, cancel")
                            .setStyle(ButtonStyle.Secondary)
                    );

                    await interaction.editReply({
                        content: "A lockdown record already exists for this channel but it is not currently locked. Do you want to overwrite it?",
                        components: [row],
                    });

                    const filter = (i: any) =>
                        i.user.id === interaction.user.id &&
                        (i.customId === "lockdown_overwrite_yes" || i.customId === "lockdown_overwrite_no");

                    try {
                        const confirmation = await interaction.channel.awaitMessageComponent({
                            filter,
                            time: 15000,
                        });

                        if (confirmation.customId === "lockdown_overwrite_yes") {
                            await confirmation.update({ content: "Overwriting lockdown record...", components: [] });
                        } else {
                            await confirmation.update({ content: "Lockdown creation cancelled.", components: [] });
                            return;
                        }
                    } catch {
                        await interaction.editReply({ content: "No response, lockdown creation cancelled.", components: [] });
                        return;
                    }
                }

                if (lockTime < now) {
                    await interaction.editReply({
                        content: "Lock time cannot be in the past.",
                    });
                    return;
                }

                if (unlockTime < now) {
                    await interaction.editReply({
                        content: "Unlock time cannot be in the past.",
                    });
                    return;
                }

                if (unlockTime <= lockTime) {
                    await interaction.editReply({
                        content: "Unlock time must be after lock time.",
                    });
                    return;
                }

                await ChannelLockdown.updateOne(
                    {
                        guildId: interaction.guildId,
                        channelId: channel.id,
                    },
                    {
                        LockId: `${interaction.guildId}${channel.id}`,
                        startTimestamp: lockTime.toString(),
                        endTimestamp: unlockTime.toString(),
                        locked: false
                    },
                    { upsert: true },
                );
                if (lockTime === now) {
                    if (
                        channel.type === ChannelType.GuildText ||
                        channel.type === ChannelType.GuildForum
                    ) {
                        await channel.permissionOverwrites.edit(
                            interaction.guild.roles.everyone.id,
                            {
                                SendMessages: false,
                                SendMessagesInThreads: false,
                                CreatePrivateThreads: false,
                                CreatePublicThreads: false,
                            }
                        );

                        const guildPreferences = await GuildPreferencesCache.get(interaction.guildId);
                        const modRoleId = guildPreferences?.moderatorRoleId;

                        if (modRoleId && interaction.guild.roles.cache.has(modRoleId)) {
                            const modRole = interaction.guild.roles.cache.get(modRoleId);
                            await channel.permissionOverwrites.edit(
                                modRole!.id,
                                {
                                    SendMessages: true,
                                    SendMessagesInThreads: true,
                                    CreatePrivateThreads: true,
                                    CreatePublicThreads: true,
                                }
                            );
                        }
                        if (channel.type === ChannelType.GuildText) {
                            await (channel as import("discord.js").TextChannel).send("https://raw.githubusercontent.com/Juzcallmekaushik/r-igcse-bot/refs/heads/assets/r-igcse_locked_banner_gif_1_1.gif");
                        }
                    } else if (
                        channel.type === ChannelType.PublicThread ||
                        channel.type === ChannelType.PrivateThread
                    ) {
                        if (!channel.locked) {
                            await channel.setLocked(true);
                            await channel.send("https://raw.githubusercontent.com/Juzcallmekaushik/r-igcse-bot/refs/heads/assets/r-igcse_locked_banner_gif_1_1.gif");
                        }
                    }
                    await ChannelLockdown.updateOne(
                        {
                            guildId: interaction.guildId,
                            channelId: channel.id,
                        },
                        {
                            $set: { locked: true }
                        },
                        { upsert: false }
                    );

                    await interaction.editReply({
                        content: `<#${channel.id}> will be locked at <t:${lockTime}:F> (<t:${lockTime}:R>) and will be unlocked at <t:${unlockTime}:F> (<t:${unlockTime}:R>)`,
                    });
                    break;
                }
                break;
            }
            case "remove": {
                    const channel = interaction.options.getChannel("channel", true, [
                    ChannelType.GuildText,
                    ChannelType.PublicThread,
                    ChannelType.GuildForum,
                    ChannelType.PrivateThread,
                ]);

                const record = await ChannelLockdown.findOne({
                    guildId: interaction.guildId,
                    channelId: channel.id,
                });

                if (!record) {
                    await interaction.editReply({
                        content: "No lockdown record found for this channel.",
                    });
                    return;
                }

                if (
                    channel.type === ChannelType.GuildText ||
                    channel.type === ChannelType.GuildForum
                ) {
                    await channel.permissionOverwrites.edit(
                        interaction.guild.roles.everyone.id,
                        {
                            SendMessages: null,
                            SendMessagesInThreads: null,
                            CreatePrivateThreads: null,
                            CreatePublicThreads: null,
                        }
                    );

                    const guildPreferences = await GuildPreferencesCache.get(interaction.guildId);
                    const modRoleId = guildPreferences?.moderatorRoleId;

                    if (modRoleId && interaction.guild.roles.cache.has(modRoleId)) {
                        const modRole = interaction.guild.roles.cache.get(modRoleId);
                        await channel.permissionOverwrites.edit(
                            modRole!.id,
                            {
                                SendMessages: null,
                                SendMessagesInThreads: null,
                                CreatePrivateThreads: null,
                                CreatePublicThreads: null,
                            }
                        );
                    }
                } else if (
                    channel.type === ChannelType.PublicThread ||
                    channel.type === ChannelType.PrivateThread
                ) {
                    if (channel.locked) {
                        await channel.setLocked(false);
                    }
                }

                await ChannelLockdown.deleteOne({
                    guildId: interaction.guildId,
                    channelId: channel.id,
                });

                await interaction.editReply({
                    content: `<#${channel.id}> has been unlocked and the lockdown record has been removed.`,
                });
                break;
            }
            default:
                await interaction.editReply({
                    content: "Unknown subcommand.",
                });
                break;
        }
    }
}
