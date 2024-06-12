import { Keyword } from "@/mongo/schemas/Keyword";
import { KeywordCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, { type DiscordChatInputCommandInteraction } from "@/registry/Structure/BaseCommand";
import {
    PermissionFlagsBits,
    SlashCommandBuilder,
    EmbedBuilder,
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalSubmitInteraction
} from "discord.js";

export default class KeywordCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("keyword")
                .setDescription("Create / Delete keywords for a server")
                .addSubcommand((command) =>
                    command.setName("add").setDescription("Add a keyword")
                )
                .addSubcommand((command) =>
                    command
                        .setName("remove")
                        .setDescription("Remove a keyword")
                        .addStringOption((option) =>
                            option
                                .setName("keyword")
                                .setDescription("Keyword to remove")
                                .setRequired(true)
                        )
                )
                .setDMPermission(false)
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction<"cached">
    ) {
        if (interaction.options.getSubcommand() === "add") {
            const keywordInput = new TextInputBuilder()
                .setCustomId("keyword")
                .setLabel("Add Keyword")
                .setPlaceholder("The keyword you would like to add")
                .setRequired(true)
                .setStyle(TextInputStyle.Short);

            const responseInput = new TextInputBuilder()
                .setCustomId("response")
                .setLabel("Add Response")
                .setPlaceholder("The response you would like to be sent")
                .setRequired(true)
                .setStyle(TextInputStyle.Paragraph);

            const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(keywordInput);
            const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(responseInput);

            const modal = new ModalBuilder()
                .setTitle("Add a keyword!")
                .setCustomId("add_keyword")
                .addComponents(row1, row2);

            await interaction.showModal(modal);

            const filter = (i: ModalSubmitInteraction) =>
                i.customId === "add_keyword" && i.user.id === interaction.user.id;

            try {
                const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 300_000 });

                const keyword = modalInteraction.fields.getTextInputValue("keyword");
                const response = modalInteraction.fields.getTextInputValue("response");

                const res = await Keyword.updateOne(
                    {
                        guildId: interaction.guildId,
                        keyword
                    },
                    {
                        response
                    },
                    {
                        upsert: true
                    }
                );

                if (res.modifiedCount + res.upsertedCount < 1) {
                    console.error(`Failed to update or upsert keyword. Response: ${JSON.stringify(res)}`);
                    await modalInteraction.reply({
                        content: "Error occurred while creating keyword. Please try again later.",
                        ephemeral: true
                    });
                    return;
                }

                await modalInteraction.reply({
                    content: `Successfully created keyword \`${keyword}\`.`,
                    ephemeral: true
                });

                await KeywordCache.append({
                    guildId: interaction.guildId,
                    keyword,
                    response
                });
            } catch (error) {
                console.error(error);
                await interaction.followUp({
                    content: "An error occurred while processing your request. Please try again later.",
                    ephemeral: true
                });
            }
        } else if (interaction.options.getSubcommand() === "remove") {
            const keyword = interaction.options.getString("keyword", true);

            const res = await Keyword.deleteOne({
                guildId: interaction.guildId,
                keyword
            });

            if (res.deletedCount < 1) {
                await interaction.reply({
                    content: "Error occurred while deleting keyword. Please try again later.",
                    ephemeral: true
                });
                return;
            }

            await interaction.reply({
                content: `Successfully deleted \`${keyword}\`.`,
                ephemeral: true
            });

            await KeywordCache.delete(interaction.guildId, keyword);
        }
    }
}