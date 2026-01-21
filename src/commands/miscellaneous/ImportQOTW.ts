import { QuestionOfTheWeek } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { Logger } from "@discordforge/logger";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";

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
							"The .txt file containing questions (newline separated)",
						)
						.setRequired(true),
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction,
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
				.filter((line) => line.trim() !== "")
				.map((line) => `${line.trim().replace(/\?+$/, "")}?`);

			if (questions.length === 0) {
				await interaction.editReply("The file appears to be empty.");
				return;
			}

			const embed = new EmbedBuilder()
				.setTitle("Import Questions Confirmation")
				.setDescription(
					`You are about to import the following ${questions.length} questions:\n\n${questions.map((q) => `- ${q}`).join("\n")}`,
				);

			const buttonCustomId = uuidv4();

			const confirmButton = new ButtonBuilder()
				.setCustomId(`confirm_${buttonCustomId}`)
				.setLabel("Confirm Import")
				.setStyle(ButtonStyle.Success);

			const cancelButton = new ButtonBuilder()
				.setCustomId(`cancel_${buttonCustomId}`)
				.setLabel("Cancel Import")
				.setStyle(ButtonStyle.Danger);

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				confirmButton,
				cancelButton,
			);

			const message = await interaction.editReply({
				embeds: [embed],
				components: [row],
			});

			const buttonResponse = await message.awaitMessageComponent({
				filter: (i) =>
					i.user.id === interaction.user.id &&
					(i.customId === `confirm_${buttonCustomId}` ||
						i.customId === `cancel_${buttonCustomId}`),
				time: 300_000,
				componentType: ComponentType.Button,
			});

			if (buttonResponse.customId === `confirm_${buttonCustomId}`) {
				await buttonResponse.deferUpdate();

				const operations = questions.map((question) => ({
					insertOne: {
						document: {
							guildId: interaction.guildId,
							question: question,
						},
					},
				}));

				await QuestionOfTheWeek.bulkWrite(operations);

				await interaction.editReply({
					content: `Successfully imported ${questions.length} questions.`,
					components: [],
					embeds: [],
				});
			} else {
				await buttonResponse.update({
					content: "Import cancelled.",
					components: [],
					embeds: [],
				});
			}
		} catch (error) {
			Logger.error(error);
			if (interaction.deferred || interaction.replied) {
				await interaction.editReply({
					content:
						"An error occurred while processing the file (or the request timed out).",
					components: [],
					embeds: [],
				});
			} else {
				await interaction.reply({
					content: "An error occurred while processing the file.",
					ephemeral: true,
				});
			}
		}
	}
}
