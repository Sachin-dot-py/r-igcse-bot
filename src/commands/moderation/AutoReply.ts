import { AutoReply } from "@/mongo/schemas/AutoReply";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
  type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { v4 as uuidv4 } from "uuid";
import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  MessageFlags,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { AutoReplyCache } from "@/redis";

export default class KickCommand extends BaseCommand {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName("auto_reply")
        .setDescription(
          "Automatically replies to all messages sent in the channel (for mods)"
        )
        .addSubcommand((command) =>
          command
            .setName("setup")
            .setDescription("Setup auto-replying to messages")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription(
                  "Channel to start auto-replying in (default: current channel)"
                )
                .setRequired(false)
            )
            .addBooleanOption((option) =>
              option
                .setName("send_dm")
                .setDescription(
                  "Whether the reply should be sent in the user's DMs (default: true)"
                )
                .setRequired(false)
            )
        )
        .addSubcommand((command) =>
          command
            .setName("clear")
            .setDescription("Clear auto-replies")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription(
                  "Channel to clear auto-replies in (default: current channel)"
                )
                .setRequired(false)
            )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false)
    );
  }

  async execute(
    client: DiscordClient<true>,
    interaction: DiscordChatInputCommandInteraction<"cached">
  ) {
    const channelId =
      interaction.options.getChannel("channel")?.id ?? interaction.channelId;
    switch (interaction.options.getSubcommand()) {
      case "setup": {
        const sendDm = interaction.options.getBoolean("send_dm") ?? true;

        const feedbackInput = new TextInputBuilder()
          .setCustomId("reply")
          .setLabel("Reply")
          .setPlaceholder("Reply to automatically send")
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
          feedbackInput
        );

        const modalCustomId = uuidv4();

        const modal = new ModalBuilder()
          .setCustomId(modalCustomId)
          .addComponents(row)
          .setTitle("Setup Auto-Reply");

        await interaction.showModal(modal);

        const modalInteraction = await interaction.awaitModalSubmit({
          time: 600_000,
          filter: (i) => i.customId === modalCustomId,
        });

        const reply = modalInteraction.fields.getTextInputValue("reply");

        await AutoReply.updateOne(
          {
            guildId: interaction.guildId,
            channelId,
          },
          {
            reply,
            sendDm,
          },
          {
            upsert: true,
          }
        );

        await modalInteraction.reply({
          content: `Auto-reply set up in <#${channelId}>, members will be sent:\n\`\`\`${reply}\`\`\``,
          flags: MessageFlags.Ephemeral,
        });

        break;
      }

      case "clear": {
        await AutoReply.deleteOne({
          guildId: interaction.guildId,
          channelId,
        });

        await AutoReplyCache.delete(interaction.guildId, channelId);

        await interaction.reply({
          content: `Auto-replies cleared successfully in <#${channelId}>`,
          flags: MessageFlags.Ephemeral,
        });

        break;
      }
    }
  }
}
