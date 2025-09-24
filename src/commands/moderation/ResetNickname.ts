import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
  type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { logToChannel } from "@/utils/Logger";
import sendDm from "@/utils/sendDm";
import {
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";

export default class KickCommand extends BaseCommand {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName("reset_name")
        .setDescription("Reset a user's display name on the server (for mods)")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to rename")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason for reset (optional)")
            .setRequired(false)
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

    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", false) ?? null;

    if (user.id === interaction.user.id) {
      interaction.editReply({
        content: "You cannot reset your own display name.",
      });
      return;
    }

    const guildPreferences = await GuildPreferencesCache.get(
      interaction.guildId
    );

    if (!guildPreferences) {
      interaction.editReply({
        content: "Please setup the bot using the command `/setup` first.",
      });
      return;
    }

    const caseNumber =
      (
        await Punishment.find({
          guildId: interaction.guildId,
        })
      ).length + 1;

    const dmEmbed = new EmbedBuilder()
      .setTitle("Nickname Reset")
      .setDescription(
        `You must rename yourself in **${interaction.guild.name}**${
          reason ? ` due to \`${reason}\`.` : "."
        }`
      )
      .setColor(Colors.Red);

    const guildMember = interaction.guild.members.cache.get(user.id);
    if (!guildMember) return;

    const memberHighestRole = guildMember.roles.highest;
    const modHighestRole = interaction.member.roles.highest;

    if (memberHighestRole.comparePositionTo(modHighestRole) >= 0) {
      interaction.editReply({
        content:
          "You cannot reset this user's display name due to role hierarchy! (Role is higher or equal to yours)",
      });

      return;
    }

    sendDm(guildMember, {
      embeds: [dmEmbed],
    });

    try {
      await interaction.guild.members.edit(user.id, {
        nick: "Reset Nickname",
      });
    } catch (error) {
      interaction.editReply({
        content: `Failed to reset user's nickname ${
          error instanceof Error ? `(${error.message})` : ""
        }`,
      });

      client.log(
        error,
        `${this.data.name} Command`,
        `**Channel:** <#${interaction.channel?.id}>
                    **User:** <@${interaction.user.id}>
                    **Guild:** ${interaction.guild.name} (${interaction.guildId})\n`
      );
    }

    Punishment.create({
      guildId: interaction.guild.id,
      actionAgainst: user.id,
      actionBy: interaction.user.id,
      action: "Nickname Reset",
      caseId: caseNumber,
      reason,
      points: 0,
      when: new Date(),
    });

    if (guildPreferences.modlogChannelId) {
      const modEmbed = new EmbedBuilder()
        .setTitle(`Nickname Reset | Case #${caseNumber}`)
        .setColor(Colors.Red)
        .addFields([
          {
            name: "User",
            value: `${user.tag} (${user.id})`,
            inline: false,
          },
          {
            name: "Moderator",
            value: `${interaction.user.tag} (${interaction.user.id})`,
            inline: false,
          },
          {
            name: "Reason",
            value: reason ?? "No reason provided",
          },
        ])
        .setTimestamp();

      logToChannel(interaction.guild, guildPreferences.modlogChannelId, {
        embeds: [modEmbed],
      });
    }

    interaction.editReply({
      content:
        "https://tenor.com/view/animeadventures-aa-anime-adventures-roblox-brainwashing-gif-1225953495429939957",
    });
    interaction.channel.send(
      `${user.username}'s nickname has been reset. (Case #${caseNumber})`
    );
  }
}
