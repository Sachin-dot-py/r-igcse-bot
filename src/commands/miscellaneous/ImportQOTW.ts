import { QuestionOfTheWeek } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
    type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { Logger } from "@discordforge/logger";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class ImportQOTWCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("import_qotw")
                .setDescription("Import questions from a txt file (for mods)")
                .setDMPermission(false)
                .addAttachmentOption((option) =>
                    option
                        .setName("file")
                        .setDescription(
                            "The .txt file containing questions (newline separated)"
                        )
                        .setRequired(true)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction
    ) {
        const attachment = interaction.options.getAttachment("file", true);

        if (!attachment.contentType?.startsWith("text/plain")) {
            await interaction.reply({
                content: "Please upload a valid .txt file.",
                ephemeral: true,
            });
            return;
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            const response = await fetch(attachment.url);
            const text = await response.text();
            const questions = text
                .split(/\r?\n/)
                .filter((line) => line.trim() !== "");

            if (questions.length === 0) {
                await interaction.editReply("The file appears to be empty.");
                return;
            }

            const operations = questions.map((question) => ({
                insertOne: {
                    document: {
                        guildId: interaction.guildId,
                        question: `${question.trim()}?`,
                    },
                },
            }));

            await QuestionOfTheWeek.bulkWrite(operations);

            await interaction.editReply(
                `Successfully imported ${questions.length} questions.`
            );
        } catch (error) {
            Logger.error(error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(
                    "An error occurred while processing the file."
                );
            } else {
                await interaction.reply({
                    content: "An error occurred while processing the file.",
                    ephemeral: true,
                });
            }
        }
    }
}
