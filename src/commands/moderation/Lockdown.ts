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
  MessageFlags,
} from "discord.js";
import { GuildPreferencesCache } from "@/redis";

export default class LockdownCommand extends BaseCommand {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName("lockdown")
        .setDescription("Lockdown related commands")
        .addSubcommand((sub) =>
          sub
            .setName("create")
            .setDescription("Lockdown a channel")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("Channel to lockdown")
                .setRequired(true)
                .addChannelTypes(
                  ChannelType.GuildText,
                  ChannelType.PublicThread,
                  ChannelType.GuildForum,
                  ChannelType.PrivateThread
                )
            )
            .addStringOption((option) =>
              option
                .setName("mode")
                .setDescription("Select lockdown mode")
                .addChoices({
                  name: "Exam Lockdown",
                  value: "exam",
                })
            )
            .addIntegerOption((option) =>
              option
                .setName("lock")
                .setDescription(
                  "Epoch time to lock the channel (defaults to now)"
                )
            )
            .addIntegerOption((option) =>
              option
                .setName("unlock")
                .setDescription(
                  "Epoch time to unlock the channel (defaults to 1 day)"
                )
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("remove")
            .setDescription("Remove lockdown from a channel")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("Channel to unlock and remove lockdown record")
                .setRequired(true)
                .addChannelTypes(
                  ChannelType.GuildText,
                  ChannelType.PublicThread,
                  ChannelType.GuildForum,
                  ChannelType.PrivateThread
                )
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("bulk")
            .setDescription("Bulk lockdown channels from a JSON file")
            .addAttachmentOption((option) =>
              option
                .setName("file")
                .setDescription("JSON file with lockdown instructions")
                .setRequired(true)
            )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false)
    );
  }

  async execute(
    client: DiscordClient<true>,
    interaction: DiscordChatInputCommandInteraction<"cached">
  ) {
    if (!interaction.channel) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
        const mode = interaction.options.getString("mode", false);
        const now = Math.floor(Date.now() / 1000);
        const lockTime = lockEpoch || now;
        const unlockTime = unlockEpoch || now + 86400;

        if (lockTime === now) {
          let isLocked = false;
          if (
            channel.type === ChannelType.GuildText ||
            channel.type === ChannelType.GuildForum
          ) {
            const perms = channel.permissionsFor(
              interaction.guild.roles.everyone
            );
            isLocked = perms && !perms.has("SendMessages");
          } else if (
            channel.type === ChannelType.PublicThread ||
            channel.type === ChannelType.PrivateThread
          ) {
            isLocked = channel.locked ?? false;
          }
          if (isLocked) {
            await interaction.editReply({
              content:
                "This channel is already locked. Please run `/lockdown remove` to remove the active lockdown first, or schedule the lockdown for a future time.",
            });
            return;
          }
        }

        const existingLockdowns = await ChannelLockdown.find({
          guildId: interaction.guildId,
          channelId: channel.id,
        });

        if (lockTime === now) {
          const activeLockdown = existingLockdowns.find(lockdown => lockdown.locked);
          if (activeLockdown) {
            await interaction.editReply({
              content: "This channel is already locked. Please run `/lockdown remove` to remove the active lockdown first.",
            });
            return;
          }
        }

        const hasOverlap = existingLockdowns.some(existing => {
          const existingStart = parseInt(existing.startTimestamp);
          const existingEnd = parseInt(existing.endTimestamp);
          
          return (
            (lockTime >= existingStart && lockTime < existingEnd) ||
            (unlockTime > existingStart && unlockTime <= existingEnd) ||
            (lockTime <= existingStart && unlockTime >= existingEnd)
          );
        });

        if (hasOverlap) {
          await interaction.editReply({
            content: "The specified time period overlaps with an existing scheduled lockdown. Please choose a different time period.",
          });
          return;
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

        const newLockdown = await ChannelLockdown.findOneAndUpdate(
          {
            guildId: interaction.guildId,
            channelId: channel.id,
          },
          {
            startTimestamp: lockTime.toString(),
            endTimestamp: unlockTime.toString(),
            mode: mode || null,
            locked: false,
          },
          { upsert: true, new: true }
        );
        
        if (lockTime === now) {
          let lockMessage: string;
          if (mode === "exam") {
            lockMessage =
              "https://github.com/Sachin-dot-py/r-igcse-bot/blob/assets/r-igcse-locked-gif.gif?raw=true";
          } else {
            lockMessage = "**Channel Locked !!**";
          }

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

            const guildPreferences = await GuildPreferencesCache.get(
              interaction.guildId
            );
            const modRoleId = guildPreferences?.moderatorRoleId;

            if (modRoleId && interaction.guild.roles.cache.has(modRoleId)) {
              const modRole = interaction.guild.roles.cache.get(modRoleId);
              await channel.permissionOverwrites.edit(modRole!.id, {
                SendMessages: true,
                SendMessagesInThreads: true,
                CreatePrivateThreads: true,
                CreatePublicThreads: true,
              });
            }

            if (channel.type === ChannelType.GuildText) {
              await (channel as import("discord.js").TextChannel).send(
                lockMessage
              );
            }
          } else if (
            channel.type === ChannelType.PublicThread ||
            channel.type === ChannelType.PrivateThread
          ) {
            if (!channel.locked) {
              await channel.setLocked(true);
              await channel.send(lockMessage);
            }
          }
          await ChannelLockdown.updateOne(
            {
              _id: newLockdown._id,
            },
            {
              $set: { locked: true },
            }
          );

          await interaction.editReply({
            content: `<#${channel.id}> has been locked and will be unlocked at <t:${unlockTime}:F> (<t:${unlockTime}:R>)`,
          });
        } else {
          await interaction.editReply({
            content: `<#${channel.id}> will be locked at <t:${lockTime}:F> (<t:${lockTime}:R>) and will be unlocked at <t:${unlockTime}:F> (<t:${unlockTime}:R>)`,
          });
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

        const records = await ChannelLockdown.find({
          guildId: interaction.guildId,
          channelId: channel.id,
        });

        if (!records || records.length === 0) {
          await interaction.editReply({
            content: "No lockdown records found for this channel.",
          });
          return;
        }

        const activeLockdown = records.find(record => record.locked);
        
        if (activeLockdown) {
          let isLocked = false;
          if (
            channel.type === ChannelType.GuildText ||
            channel.type === ChannelType.GuildForum
          ) {
            const perms = channel.permissionsFor(
              interaction.guild.roles.everyone
            );
            isLocked = perms && !perms.has("SendMessages");
          } else if (
            channel.type === ChannelType.PublicThread ||
            channel.type === ChannelType.PrivateThread
          ) {
            isLocked = channel.locked ?? false;
          }

          if (isLocked) {
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

              const guildPreferences = await GuildPreferencesCache.get(
                interaction.guildId
              );
              const modRoleId = guildPreferences?.moderatorRoleId;

              if (modRoleId && interaction.guild.roles.cache.has(modRoleId)) {
                const modRole = interaction.guild.roles.cache.get(modRoleId);
                await channel.permissionOverwrites.edit(modRole!.id, {
                  SendMessages: null,
                  SendMessagesInThreads: null,
                  CreatePrivateThreads: null,
                  CreatePublicThreads: null,
                });
              }
            } else if (
              channel.type === ChannelType.PublicThread ||
              channel.type === ChannelType.PrivateThread
            ) {
              if (channel.locked) {
                await channel.setLocked(false);
              }
            }

            if (
              channel.type === ChannelType.GuildText ||
              channel.type === ChannelType.PublicThread ||
              channel.type === ChannelType.PrivateThread
            ) {
              await (
                channel as
                  | import("discord.js").TextChannel
                  | import("discord.js").ThreadChannel
              ).send("**Channel Unlocked !!**");
            }
          }

          await ChannelLockdown.deleteOne({ _id: activeLockdown._id });
          await interaction.editReply({
            content: `<#${channel.id}> has been unlocked and the active lockdown record has been removed.`,
          });
        } else {
          await ChannelLockdown.deleteMany({
            guildId: interaction.guildId,
            channelId: channel.id,
          });
          await interaction.editReply({
            content: `All scheduled lockdown records for <#${channel.id}> have been removed.`,
          });
        }
        break;
      }
      case "bulk": {
        const file = interaction.options.getAttachment("file", true);
        if (
          !file ||
          !file.name.toLowerCase().endsWith(".json") ||
          (file.contentType && !file.contentType.includes("json"))
        ) {
          await interaction.editReply({
            content: "Please upload a valid JSON file.",
          });
          return;
        }

        let data: any[];
        try {
          const res = await fetch(file.url);
          const text = await res.text();
          data = JSON.parse(text);
          if (!Array.isArray(data)) throw new Error();
        } catch {
          await interaction.editReply({
            content: "Failed to parse the JSON file. Please check the format.",
          });
          return;
        }

        const now = Math.floor(Date.now() / 1000);
        const results: string[] = [];

        for (const entry of data) {
          const channelId = entry["channel_id"];
          let lockTime: number;
          let unlockTime: number;
          let mode: string | null = null;

          if (entry["mode"] && typeof entry["mode"] === "string") {
            mode = entry["mode"].trim().toLowerCase();
          }
          console.log(mode);
          if (typeof entry["lock_time"] === "string") {
            const str = entry["lock_time"].trim().toLowerCase();
            if (str === "now") {
              lockTime = now;
            } else if (/^\d+$/.test(str)) {
              lockTime = parseInt(str, 10);
            } else {
              const regex = /^(\d+)\s*(d|h|m|s)?$/;
              const match = str.match(regex);
              if (match) {
                const value = parseInt(match[1], 10);
                const unit = match[2] || "s";
                let seconds = 0;
                switch (unit) {
                  case "d":
                    seconds = value * 86400;
                    break;
                  case "h":
                    seconds = value * 3600;
                    break;
                  case "m":
                    seconds = value * 60;
                    break;
                  case "s":
                    seconds = value;
                    break;
                }
                lockTime = now + seconds;
              } else {
                results.push(`<#${channelId}> - Invalid lock_time`);
                continue;
              }
            }
          } else if (typeof entry["lock_time"] === "number") {
            lockTime = entry["lock_time"];
          } else {
            results.push(`<#${channelId}> - Invalid lock_time`);
            continue;
          }

          if (typeof entry["unlock_time"] === "string") {
            const str = entry["unlock_time"].trim().toLowerCase();
            if (/^\d+$/.test(str)) {
              unlockTime = parseInt(str, 10);
            } else {
              const regex = /^(\d+)\s*(d|h|m|s)?$/;
              const match = str.match(regex);
              if (match) {
                const value = parseInt(match[1], 10);
                const unit = match[2] || "s";
                let seconds = 0;
                switch (unit) {
                  case "d":
                    seconds = value * 86400;
                    break;
                  case "h":
                    seconds = value * 3600;
                    break;
                  case "m":
                    seconds = value * 60;
                    break;
                  case "s":
                    seconds = value;
                    break;
                }
                unlockTime = lockTime + seconds;
              } else {
                results.push(`<#${channelId}> - Invalid unlock_time`);
                continue;
              }
            }
          } else if (typeof entry["unlock_time"] === "number") {
            unlockTime = entry["unlock_time"];
          } else {
            results.push(`<#${channelId}> - Invalid unlock_time`);
            continue;
          }

          if (unlockTime <= lockTime) {
            results.push(
              `<#${channelId}> - unlock_time must be after lock_time`
            );
            continue;
          }

          const channel = interaction.guild.channels.cache.get(channelId);
          if (!channel) {
            results.push(`<#${channelId}> - Channel not found`);
            continue;
          }

          let isLocked = false;
          if (
            channel.type === ChannelType.GuildText ||
            channel.type === ChannelType.GuildForum
          ) {
            const perms = channel.permissionsFor(
              interaction.guild.roles.everyone
            );
            isLocked = perms && !perms.has("SendMessages");
          } else if (
            channel.type === ChannelType.PublicThread ||
            channel.type === ChannelType.PrivateThread
          ) {
            isLocked = channel.locked ?? false;
          }

          const existingLockdowns = await ChannelLockdown.find({
            guildId: interaction.guildId,
            channelId: channel.id,
          });

          const activeLockdown = existingLockdowns.find(lockdown => lockdown.locked);
          if (activeLockdown && lockTime === now) {
            results.push(`<#${channelId}> - Channel is already locked`);
            continue;
          }

          const hasOverlap = existingLockdowns.some(existing => {
            const existingStart = parseInt(existing.startTimestamp);
            const existingEnd = parseInt(existing.endTimestamp);
            
            return (
              (lockTime >= existingStart && lockTime < existingEnd) ||
              (unlockTime > existingStart && unlockTime <= existingEnd) ||
              (lockTime <= existingStart && unlockTime >= existingEnd)
            );
          });

          if (hasOverlap) {
            results.push(`<#${channelId}> - Time period overlaps with existing lockdown`);
            continue;
          }

          const newLockdown = await ChannelLockdown.create({
            guildId: interaction.guildId,
            channelId: channel.id,
            startTimestamp: lockTime.toString(),
            endTimestamp: unlockTime.toString(),
            ...(mode && { mode }),
            locked: false,
          });

          if (lockTime === now && !isLocked) {
            let lockMessage: string;
            if (mode === "exam") {
              lockMessage =
                "https://github.com/Sachin-dot-py/r-igcse-bot/blob/assets/r-igcse-locked-gif.gif?raw=true";
            } else {
              lockMessage = "**Channel Locked !!**";
            }

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

              const guildPreferences = await GuildPreferencesCache.get(
                interaction.guildId
              );
              const modRoleId = guildPreferences?.moderatorRoleId;

              if (modRoleId && interaction.guild.roles.cache.has(modRoleId)) {
                const modRole = interaction.guild.roles.cache.get(modRoleId);
                await channel.permissionOverwrites.edit(modRole!.id, {
                  SendMessages: true,
                  SendMessagesInThreads: true,
                  CreatePrivateThreads: true,
                  CreatePublicThreads: true,
                });
              }
              if (channel.type === ChannelType.GuildText) {
                await (channel as import("discord.js").TextChannel).send(
                  lockMessage
                );
              }
            } else if (
              channel.type === ChannelType.PublicThread ||
              channel.type === ChannelType.PrivateThread
            ) {
              if (!channel.locked) {
                await channel.setLocked(true);
                await channel.send(lockMessage);
              }
            }
            await ChannelLockdown.updateOne(
              {
                _id: newLockdown._id,
              },
              {
                $set: { locked: true },
              }
            );
            results.push(
              `<#${channelId}> Locked now, unlocks <t:${unlockTime}:R>`
            );
          } else if (lockTime !== now) {
          } else {
            results.push(
              `<#${channelId}> Scheduled lock <t:${lockTime}:R>, unlock <t:${unlockTime}:R>`
            );
          }
        }

        await interaction.editReply({
          content: results.join("\n") || "No valid entries processed.",
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
