import { DmTemplate } from "@/mongo";
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  AutocompleteInteraction,
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

    async execute(
    client: DiscordClient<true>,
    interaction: DiscordChatInputCommandInteraction<"cached">,
  ) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (sub === "add") {
      // Show modal for add
      await interaction.showModal({
        customId: `template_add_modal`,
        title: "Add DM Template",
        components: [
          {
            type: 1, // ActionRow
            components: [
              {
                type: 4, // TextInput
                customId: "name",
                label: "Template Name",
                style: 1,
                minLength: 2,
                maxLength: 32,
                required: true,
              },
            ],
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                customId: "message",
                label: "Message (can use {fields})",
                style: 2,
                minLength: 1,
                maxLength: 2000,
                required: true,
              },
            ],
          },
        ],
      });
      return;
    }

    if (sub === "edit") {
      // Get template name
      const name = interaction.options.getString("name", true);
      const template = await DmTemplate.findOne({ guildId, name });
      if (!template) {
        await interaction.reply({
          content: `Template \\"${name}\\" not found.`,
          ephemeral: true,
        });
        return;
      }
      // Show modal for edit
      await interaction.showModal({
        customId: `template_edit_modal:${name}`,
        title: `Edit DM Template: ${name}`,
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                customId: "message",
                label: "Message (can use {fields})",
                style: 2,
                minLength: 1,
                maxLength: 2000,
                required: true,
                value: template.message,
              },
            ],
          },
        ],
      });
      return;
    }

    await interaction.reply({
      content: "This subcommand is not yet implemented.",
      ephemeral: true,
    });
  }


  // Autocomplete for template names
  async autoComplete(interaction: AutocompleteInteraction) {
    const sub = interaction.options.getSubcommand(true);
    const focusedRaw = interaction.options.getFocused();
    const focused = typeof focusedRaw === "string" ? focusedRaw : "";
    const guildId = interaction.guildId;
    if (!guildId || !["edit", "send", "delete"].includes(sub)) return;
    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name !== "name") return;
    const templates = await DmTemplate.find({ guildId });
    const choices = templates
      .map((t: any) => t.name)
      .filter((name: string) => name.toLowerCase().includes(focused.toLowerCase()));
    await interaction.respond(
      choices.slice(0, 25).map((name: string) => ({ name, value: name }))
    );
  }
}
