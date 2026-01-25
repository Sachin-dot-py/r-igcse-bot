import type { DiscordClient } from "@/registry/DiscordClient";
import { MessageFlags, SlashCommandBuilder } from "discord.js";
import BaseCommand, {
  type DiscordChatInputCommandInteraction,
} from "../../registry/Structure/BaseCommand";

export default class EpochCommand extends BaseCommand {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName("epoch")
        .setDescription("Get the epoch timestamp of a specified time")
        .addStringOption((option) =>
          option
            .setName("date")
            .setDescription("Date of the timestamp (UTC) (YYYY-MM-DD)")
        )
        .addStringOption((option) =>
          option
            .setName("time")
            .setDescription("Exact time of the timestamp (UTC) (HH:MM:SS)")
        )
    );
  }

  async execute(
    client: DiscordClient<true>,
    interaction: DiscordChatInputCommandInteraction
  ) {
    const now = new Date();
    const date =
      interaction.options.getString("date", false) ??
      now.toLocaleDateString("fr-CA", { timeZone: "UTC" });
    const time =
      interaction.options.getString("time", false) ??
      now.toLocaleTimeString("en-GB", { timeZone: "UTC" });

    const epoch = Math.round(new Date(`${date}T${time}Z`).getTime() / 1000);

    if (!epoch || Number.isNaN(epoch)) {
      interaction.reply({
        content:
          "Invalid date or time provided. Follow the **YYYY-MM-DD** and **HH:MM:SS** format.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    interaction.reply({
      content: `The epoch timestamp for <t:${epoch}> is **${epoch}**`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
