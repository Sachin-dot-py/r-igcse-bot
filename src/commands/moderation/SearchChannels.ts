import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
  type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  MessageFlags,
  ChannelType,
  AttachmentBuilder,
} from "discord.js";

export default class SearchChannelsCommand extends BaseCommand {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName("search_channels")
        .setDescription("Returns a csv with info about all channels (for mods)")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false)
    );
  }

  async execute(
    client: DiscordClient<true>,
    interaction: DiscordChatInputCommandInteraction<"cached">
  ) {
    await interaction.deferReply({});

    let csv = "ChannelID,ChannelName,CategoryName,ChannelTopic\n";

    const channels = interaction.guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildText)
      .filter((c) => c.topic?.includes("Subject"))
      .map((c) => c);

    for (const channel of channels) {
      csv += `"${channel.id}", "${channel.name}", "${
        channel.parent?.name ?? "No Category"
      } (${channel.parentId ?? ""})", "${
        channel.topic
          ?.replace("\n", " ")
          ?.replace(",", " ")
          ?.replace('""', "") ?? "No Topic"
      }\n"`;
    }
    const csvBuffer = Buffer.from(csv);

    const csvAttachment = new AttachmentBuilder(csvBuffer, {
      name: `${interaction.guild.name} Channel Info.csv`,
    });

    interaction.editReply({
      content: "Channel info fetched.",
      files: [csvAttachment],
    });
  }
}
