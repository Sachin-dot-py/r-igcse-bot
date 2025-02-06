import { GetRoleAttempt } from "@/mongo/schemas/GetRoleAttempt";
import { GetRoleQnA } from "@/mongo/schemas/GetRoleQnA";
import { ButtonInteractionCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	type GuildMemberRoleManager,
	SlashCommandBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";

export default class PingCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("getrole")
				.setDescription("Get the 2024 role")
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction,
	) {
		if (interaction.guildId !== process.env.MAIN_GUILD_ID) {
			interaction.reply({
				content:
					"You may only use this command in the official r/IGCSE server",
				ephemeral: true,
			});
			return;
		}

		const attempts = await GetRoleAttempt.findOne({
			userId: interaction.user.id,
		});

		if (attempts && attempts.questions.length >= 3) {
			interaction.reply({
				content: "You have no more attempts left.",
				ephemeral: true,
			});
			return;
		}

		const questions = await GetRoleQnA.find({
			question: { $nin: attempts?.questions },
		});

		const question =
			questions[Math.floor(Math.random() * questions.length)];

		if (!question) {
			interaction.reply({
				content: "This command has not been set-up, DM a Moderator.",
				ephemeral: true,
			});
			return;
		}

		if (!interaction.guild) {
			return;
		}

		const role = interaction.guild.roles.cache.get(process.env.GET_ROLE);
		const member = interaction.member;

		if (!role) {
			return;
		}

		if (
			(member?.roles as GuildMemberRoleManager).cache.some(
				(r) => r.id === role.id,
			)
		) {
			interaction.reply({
				content: "You already have the 2024 role.",
				ephemeral: true,
			});
			return;
		}

		const embed = new EmbedBuilder()
			.setTitle("2024 Role")
			.setDescription(question.question)
			.setFooter({ text: "Answer the question to receive the role!" })
			.setColor("Random");

		const customId = uuidv4();

		const answerButton = new ButtonBuilder()
			.setLabel("Answer")
			.setStyle(ButtonStyle.Primary)
			.setCustomId(`${customId}_question_answer`);

		const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			answerButton,
		);

		const message = await interaction.reply({
			embeds: [embed],
			components: [buttonsRow],
			ephemeral: true,
		});

		await ButtonInteractionCache.set(`${customId}_question`, {
			customId: `${customId}_question`,
			messageId: message.id,
			guildId: interaction.guildId,
			userId: interaction.user.id,
			questionAndAnswers: [question.question, ...question.answers],
		});

		ButtonInteractionCache.expire(`${customId}_question`, 3 * 24 * 60 * 60); // 3 days
		// Interaction will be handled in the InteractionCreate event and is stored in redis (@/events/InteractionCreate.ts)
	}
}
