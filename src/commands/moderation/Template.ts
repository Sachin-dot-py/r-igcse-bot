import { DmTemplate } from "@/mongo";
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from "discord.js";
import BaseCommand, { type DiscordChatInputCommandInteraction } from "@/registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";

export default class TemplateCommand extends BaseCommand {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName("template")
        .setDescription("Manage DM templates for modmail")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand((sub) =>
          sub
            .setName("add")
            .setDescription("Add a new DM template")
        )
        .addSubcommand((sub) =>
          sub
            .setName("send")
            .setDescription("Send a DM template to a user")
            .addBooleanOption((opt) =>
              opt.setName("anonymous")
                .setDescription("Send anonymously or not")
                .setRequired(true)
            )
            .addUserOption((opt) =>
              opt.setName("user")
                .setDescription("User to DM (optional if in DM thread)")
                .setRequired(false)
            )
            .addStringOption((opt) =>
              opt.setName("name")
                .setDescription("Template name")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("edit")
            .setDescription("Edit a DM template")
            .addStringOption((opt) =>
              opt.setName("name")
                .setDescription("Template name")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("delete")
            .setDescription("Delete a DM template")
            .addStringOption((opt) =>
              opt.setName("name")
                .setDescription("Template name")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
    );
  }

  // TODO: Implement command logic
  async execute(
    client: DiscordClient<true>,
    interaction: DiscordChatInputCommandInteraction<"cached">,
  ) {
    await interaction.reply({
      content: "This command is under construction.",
      ephemeral: true,
    });
  }
}
