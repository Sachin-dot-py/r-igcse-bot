import {
	SlashCommandBuilder,
	StringSelectMenuOptionBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ComponentType,
} from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import Select from "@/components/practice/Select";
import SessionInfoModal from "@/components/practice/SessionInfoModal";
import Buttons from "@/components/practice/Buttons";
import { practiceSubjects, subjectTopics } from "@/data";
import { v4 as uuidv4 } from "uuid";
import type { DiscordClient } from "@/registry/DiscordClient";
import { logger } from "@/index";
import { PracticeSessionCache, UserCache } from "@/redis";

type CommandOptions = {
	[key: string]: (
		interaction: DiscordChatInputCommandInteraction,
	) => Promise<void>;
};

export default class PracticeCommand extends BaseCommand {
	constructor() {
		const actions = [
			"New Session",
			"Leave Session",
			"End Session",
			"List Sessions",
			"Join Session",
			"Pause Session",
			"Resume Session",
			"Add to Session",
			"Remove from Session",
			"Session Info",
		];
		super(
			new SlashCommandBuilder()
				.setName("practice")
				.setDescription("Practice IGCSE Questions (MCQs only)")
				.addStringOption((option) =>
					option
						.setName("action")
						.addChoices(
							...actions.map((key) => ({ name: key, value: key })),
						)
						.setDescription("Choose an action")
						.setRequired(true),
				),
		);
	}

	options: CommandOptions = {
		"New Session": this.newSession,
		"Leave Session": this.leaveSession,
		"End Session": this.endSession,
		"List Sessions": this.listSessions,
		"Join Session": this.joinSession,
		"Pause Session": this.pauseSession,
		"Resume Session": this.resumeSession,
		"Add to Session": this.addToSession,
		"Remove from Session": this.removeFromSession,
		"Session Info": this.sessionInfo,
	};

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction,
	) {
		const action = interaction.options.getString("action");
		if (action) {
			this.options[action].bind(this)(interaction);
		}
	}

	private async newSession(interaction: DiscordChatInputCommandInteraction) {
		await this.userInSessionCheck(interaction, false);
		const modalCustomId = uuidv4();
		const modal = new SessionInfoModal(modalCustomId);

		await interaction.showModal(modal);
		const modalResponse = await modal.waitForResponse(modalCustomId, interaction);
		if (!modalResponse) return;
		const { minimumYear, numberOfQuestions, followUpInteraction } = modalResponse;

		const subjectCustomId = uuidv4();
		const subjectSelect = new Select(
			"subject",
			"Select a subject",
			await this.getSubjects(),
			1,
			subjectCustomId,
		);

		const subjectComponents = [
			new ActionRowBuilder<Select>().addComponents(subjectSelect),
			new Buttons(subjectCustomId) as ActionRowBuilder<ButtonBuilder>,
		]

		const subjectInteraction = await followUpInteraction.reply({
			content: "Select a subject",
			components: subjectComponents,
			ephemeral: true,
			fetchReply: true
		});

		const subject = await subjectSelect.waitForResponse(subjectCustomId, subjectInteraction);
		if (!subject) return;

		const topicCustomId = uuidv4();
		const topicSelectOptions = await this.getTopics(subject[0]);
		const topicSelects = await this.getTopicSelects(topicSelectOptions, topicCustomId);

		const topicComponents = topicSelects.map((select) => new ActionRowBuilder<Select>().addComponents(select)) as ActionRowBuilder<any>[];
		topicComponents.push(new Buttons(topicCustomId) as ActionRowBuilder<ButtonBuilder>);

		const topicInteraction = await followUpInteraction.editReply({
			content: "Select a topic",
			components: topicComponents
		});

		const topicArrays = await Promise.all(
			topicSelects.map((select, index) => select.waitForResponse(`${topicCustomId}_${index}`, topicInteraction))
		);

		const topics = topicArrays.flat();
		if (!topics) return;

		
	}

	private async leaveSession(interaction: DiscordChatInputCommandInteraction) {}

	private async endSession(interaction: DiscordChatInputCommandInteraction) {}

	private async listSessions(interaction: DiscordChatInputCommandInteraction) {}

	private async joinSession(interaction: DiscordChatInputCommandInteraction) {}

	private async pauseSession(interaction: DiscordChatInputCommandInteraction) {}

	private async resumeSession(
		interaction: DiscordChatInputCommandInteraction,
	) {}

	private async addToSession(interaction: DiscordChatInputCommandInteraction) {}

	private async removeFromSession(
		interaction: DiscordChatInputCommandInteraction,
	) {}

	private async sessionInfo(interaction: DiscordChatInputCommandInteraction) {}

	async getSubjects(): Promise<StringSelectMenuOptionBuilder[]> {
		return Object.entries(practiceSubjects).map(
			([key, value]) =>
				new StringSelectMenuOptionBuilder()
					.setLabel(`${value} (${key})`)
					.setValue(key),
		);
	}

	private async getTopics(subject: string): Promise<StringSelectMenuOptionBuilder[]> {
		return subjectTopics[subject].map((topic) =>
			new StringSelectMenuOptionBuilder().setLabel(topic).setValue(topic),
		);
	}

	private async getTopicSelects(
		topicSelectOptions: StringSelectMenuOptionBuilder[],
		customId: string,
	): Promise<Select[]> {
		const topicSelects: Select[] = [];
		for (let i = 0; i < topicSelectOptions.length; i += 25) {
			const topicSelect = new Select(
				`topic_${i}`,
				"Select a topic",
				topicSelectOptions.slice(i, i + 25),
				topicSelectOptions.length - i > 25 ? 25 : topicSelectOptions.length - i,
				`${customId}_${i}`,
			);
			topicSelects.push(topicSelect);
		}
		return topicSelects;
	}

	/**
	 * @param inSession - Whether the user needs to be in a session or not
	 */
	private async userInSessionCheck(interaction: DiscordChatInputCommandInteraction, inSession: boolean): Promise<void> {
		const userId = interaction.user.id;
		const user = await UserCache.get(userId);
	
		if (!user) {
			return;
		}

		switch (inSession) {
			case true:
				if (!user?.sessionId) {
					await interaction.reply({
						content: "You need to be in a session to use this command.",
						ephemeral: true,
					});
					return;
				}
				break;
			case false:
				if (user?.sessionId) {
					await interaction.reply({
						content: "You are already in a session",
						ephemeral: true,
					});
					return;
				}
				break;
		}
	}
}
