import { GetRoleAttempt } from "@/mongo/schemas/GetRoleAttempt";
import { GetRoleQnA } from "@/mongo/schemas/GetRoleQnA";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	type GuildMemberRoleManager,
	MessageFlags,
	ModalBuilder,
	SlashCommandBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";

export default class PingCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("getrole")
				.setDescription("Get the 2025 role")
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
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		let attempts = await GetRoleAttempt.findOne({
			userId: interaction.user.id,
		});

		const questions = await GetRoleQnA.find({
			question: { $nin: attempts?.questions },
		});
		const question =
			questions[Math.floor(Math.random() * questions.length)];

		if (!question) {
			interaction.reply({
				content: "This command has not been set-up, DM a Moderator.",
				flags: MessageFlags.Ephemeral,
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
				content: `You already have the ${role} role.`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		};

		const answerInput = new TextInputBuilder()
			.setCustomId("answer_input")
			.setLabel(question.label)
			.setPlaceholder(question.question)
			.setRequired(true)
			.setStyle(TextInputStyle.Paragraph);

		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
			answerInput,
		);

		const modalCustomId = uuidv4();

		const modal = new ModalBuilder()
			.setCustomId(modalCustomId)
			.addComponents(row)
			.setTitle("Question!");

		await interaction.showModal(modal);

		const modalInteraction = await interaction.awaitModalSubmit({
			time: 600_000,
			filter: (i) => i.customId === modalCustomId,
		});

		await modalInteraction.deferReply({ flags: MessageFlags.Ephemeral });

		await GetRoleAttempt.updateOne(
			{
				guildId: interaction.guildId,
				userId: interaction.user.id,
			},
			{
				$push: { questions: question.question },
			},
			{
				upsert: true,
			},
		);

		attempts = await GetRoleAttempt.findOne({
			userId: interaction.user.id,
		});

		if (!attempts) {
			modalInteraction.editReply({
				content: "An error occurred.",
			});
			return;
		}

		if (attempts.questions.length > 3) {
			modalInteraction.editReply({
				content: "You have no more attempts left.",
			});
			return;
		}

		const answer =
			modalInteraction.fields.getTextInputValue("answer_input");

		if (question.answers.includes(answer.toLowerCase())) {
			(member?.roles as GuildMemberRoleManager).add(role);

			modalInteraction.editReply({
				content: `Congratulations, you got the answer right! The <@&${process.env.GET_ROLE}> role has been given to you.`,
			});
		} else {
			modalInteraction.editReply({
				content: `Incorrect answer, you have ${3 - attempts.questions.length} attempt(s) left.`,
			});
		}
	}
}