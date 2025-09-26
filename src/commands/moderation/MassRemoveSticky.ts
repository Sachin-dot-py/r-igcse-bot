import { StickyMessage } from "@/mongo";
import { StickyMessageCache, GuildPreferencesCache } from "@/redis";
import type { ICachedStickyMessage } from "@/redis/schemas/StickyMessage";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
  type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { logToChannel } from "@/utils/Logger";
import {
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  MessageFlags,
  ChannelType,
} from "discord.js";

export default class KickCommand extends BaseCommand {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName("mass_remove_sticky")
        .setDescription(
          "Remove sticky messages from all channels in a category (for mods)"
        )
        .addStringOption((option) =>
          option
            .setName("category_id")
            .setDescription("ID of the category to remove sticky messages from")
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false)
    );
  }

  async execute(
    client: DiscordClient<true>,
    interaction: DiscordChatInputCommandInteraction<"cached">
  ) {
    if (!interaction.channel || !interaction.channel.isTextBased()) return;

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const categoryId = interaction.options.getString("category_id", true);
    const categoryChannel = interaction.guild.channels.cache.get(categoryId);

    if (
      !categoryChannel ||
      categoryChannel.type !== ChannelType.GuildCategory
    ) {
      interaction.editReply({
        content: "ID provided is not a valid category channel",
      });
      return;
    }

    const stickyChannels = categoryChannel?.children.cache.filter((c) =>
      c.isTextBased()
    );

    for (const [, channel] of stickyChannels) {
      const stickyMessages = await StickyMessageCache.search()
        .where("channelId")
        .equals(channel.id)
        .return.allIds();

      if (stickyMessages) {
        await StickyMessageCache.remove(...stickyMessages);
        await StickyMessage.deleteMany({
          channelId: channel.id,
        });
      }
    }

    const guildPreferences = await GuildPreferencesCache.get(
      interaction.guildId
    );

    if (guildPreferences?.generalLogsChannelId) {
      logToChannel(interaction.guild, guildPreferences.generalLogsChannelId, {
        embeds: [
          new EmbedBuilder()
            .setTitle("Messages Unstickied")
            .setDescription(
              `All messages in <#${categoryId}> unstickied by ${interaction.user.tag} (${interaction.user.id})`
            )
            .setColor("Green")
            .setTimestamp(),
        ],
      }).catch(() => {
        interaction.followUp({
          content: "Invalid log channel, contact admins",
          flags: MessageFlags.Ephemeral,
        });
      });
    }

    interaction.editReply({
      content: `Unstickied all messages in <#${categoryId}>`,
    });
  }
}
