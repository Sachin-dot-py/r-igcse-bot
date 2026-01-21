import { GuildPreferences, QuestionOfTheWeek } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	ComponentType,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";

export default class extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("qotw")
				.setDescription("Send this week's question (for mods)")
				.setDMPermission(false)
				.addStringOption((option) =>
					option
						.setName("question")
						.setDescription(
							"The question to be asked (leave empty for a random question)",
						)
						.setRequired(false),
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		let question = interaction.options.getString("question", false);
		let qotwDocId = null;

		if (!question) {
			const randomQuestion = await QuestionOfTheWeek.aggregate([
				{
					$match: {
						guildId: interaction.guildId,
						asked: { $ne: true },
					},
				},
				{ $sample: { size: 1 } },
			]);

			if (!randomQuestion.length || !randomQuestion[0]) {
				await interaction.reply({
					content:
						"No unasked questions found in the database for this guild.",
					ephemeral: true,
				});
				return;
			}

			question = randomQuestion[0].question;
			qotwDocId = randomQuestion[0]._id;
		}

		const guildPreferences = await GuildPreferences.findOne({
			guildId: interaction.guildId,
		});

		if (
			!guildPreferences ||
			!guildPreferences.qotwChannelId ||
			!guildPreferences.qotwRoleId
		) {
			await interaction.reply({
				content:
					"Please configure both the QOTW channel and QOTW role in Guild Preferences.",
				ephemeral: true,
			});
			return;
		}

		const channel = interaction.guild.channels.cache.get(
			guildPreferences.qotwChannelId,
		);

		if (
			!channel ||
			!channel.isTextBased() ||
			channel.type !== ChannelType.GuildText
		) {
			await interaction.reply({
				content:
					"The configured QOTW channel is invalid or does not support threads.",
				ephemeral: true,
			});
			return;
		}

		const confirmEmbed = new EmbedBuilder()
			.setTitle("Confirm Question of the Week")
			.setDescription(
				`You are about to send the following question to <#${guildPreferences.qotwChannelId}>:\n\n**${question}**`,
			);

		const buttonCustomId = uuidv4();

		const confirmButton = new ButtonBuilder()
			.setCustomId(`confirm_${buttonCustomId}`)
			.setLabel("Confirm Send")
			.setStyle(ButtonStyle.Success);

		const cancelButton = new ButtonBuilder()
			.setCustomId(`cancel_${buttonCustomId}`)
			.setLabel("Cancel Send")
			.setStyle(ButtonStyle.Danger);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			confirmButton,
			cancelButton,
		);

		const response = await interaction.reply({
			embeds: [confirmEmbed],
			components: [row],
			ephemeral: true,
		});

		try {
			const buttonInteraction = await response.awaitMessageComponent({
				filter: (i) =>
					i.user.id === interaction.user.id &&
					(i.customId === `confirm_${buttonCustomId}` ||
						i.customId === `cancel_${buttonCustomId}`),
				time: 300_000,
				componentType: ComponentType.Button,
			});

			if (buttonInteraction.customId === `confirm_${buttonCustomId}`) {
				await buttonInteraction.deferUpdate();

				const role = interaction.guild.roles.cache.get(
					guildPreferences.qotwRoleId,
				);

				const embed = new EmbedBuilder()
					.setTitle("Question of the Week")
					.setDescription(question)
					.setColor(role?.hexColor || "#FFFFFF");

				const message = await channel.send({
					content: `<@&${guildPreferences.qotwRoleId}>`,
					embeds: [embed],
				});

				const date = new Date().toISOString().split("T")[0];

				const thread = await message.startThread({
					name: `QOTW - (${date})`,
				});

				await thread.send("Answer this week's question here");

				if (qotwDocId) {
					await QuestionOfTheWeek.updateOne(
						{ _id: qotwDocId },
						{ asked: true },
					);
				}

				const remaining = await QuestionOfTheWeek.countDocuments({
					guildId: interaction.guildId,
					asked: { $ne: true },
				});

				await interaction.editReply({
					content: `Question sent to ${channel} (Questions remaining: ${remaining})`,
					embeds: [],
					components: [],
				});
			} else {
				await buttonInteraction.update({
					content: "Cancelled sending the question.",
					embeds: [],
					components: [],
				});
			}
		} catch (error) {
			console.error(error);
			await interaction.editReply({
				content: "An error occurred or the request timed out.",
				embeds: [],
				components: [],
			});
		}
	}
}
