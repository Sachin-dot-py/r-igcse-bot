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
import { practiceSubjects, topicsForSubjects } from "@/data";
import { v4 as uuidv4 } from "uuid";
import type { DiscordClient } from "@/registry/DiscordClient";

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
							...Object.keys(actions).map((key) => ({ name: key, value: key })),
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
		interaction: DiscordChatInputCommandInteraction,
		client: DiscordClient,
	) {
		const action = interaction.options.getString("action");
		if (action) {
			this.options[action](interaction);
		}
	}

	private async newSession(interaction: DiscordChatInputCommandInteraction) {
		// const sessionUser = await PracticeUserCache.get(interaction.user.id);
		// if (sessionUser?.playing) {
		// 	await interaction.reply({
		// 		content: "You are already in a session",
		// 		ephemeral: true,
		// 	});
		// 	return;
		// }

		const modalCustomId = uuidv4();
		const sessionInfoModal = new SessionInfoModal(modalCustomId);

		await interaction.showModal(sessionInfoModal);

		// collect the data from the modal
		const sessionInfo = await interaction.awaitModalSubmit({
			time: 60000,
			filter: (i) => i.customId === modalCustomId,
		});

		const minimumYear = sessionInfo.fields.getTextInputValue("minimum_year");
		const numberOfQuestions = sessionInfo.fields.getTextInputValue(
			"number_of_questions",
		);

		if (!minimumYear || !numberOfQuestions) {
			await interaction.reply({
				content: "Please provide the minimum year and number of questions",
				ephemeral: true,
			});
			return;
		}

		const subjectSelectOptions = Object.entries(practiceSubjects).map(
			([key, value]) =>
				new StringSelectMenuOptionBuilder()
					.setLabel(`${value} (${key})`)
					.setValue(key),
		);
		const SelectMenuCustomId = uuidv4();
		const subjectSelect = new Select(
			"subject",
			"Select a subject",
			subjectSelectOptions,
			1,
			SelectMenuCustomId,
		);

		const selectComponents = [
			new ActionRowBuilder<Select>().addComponents(subjectSelect),
			new Buttons(SelectMenuCustomId) as ActionRowBuilder<ButtonBuilder>,
		];

		const responseSubject = await interaction.reply({
			content: "Select a subject",
			components: selectComponents,
			ephemeral: true,
		});

		const subject = await responseSubject.awaitMessageComponent({
			time: 60000,
			filter: (i) => i.customId === SelectMenuCustomId,
			componentType: ComponentType.StringSelect,
		});

		const selectedSubject = subject.values?.[0];

		if (!selectedSubject) {
			await interaction.editReply("Please select a subject");
			return;
		}

		const topicSelectOptions = topicsForSubjects[selectedSubject].map((topic) =>
			new StringSelectMenuOptionBuilder().setLabel(topic).setValue(topic),
		);
		const topicSelects: Select[] = [];
		const topicSelectCustomId = uuidv4();

		for (let i = 0; i < topicSelectOptions.length; i += 25) {
			const topicSelect = new Select(
				`topic_${i}`,
				"Select a topic",
				topicSelectOptions.slice(i, i + 25),
				1,
				`${topicSelectCustomId}_${i}`,
			);
			topicSelects.push(topicSelect);
		}

		const topicSelectComponents: ActionRowBuilder<any>[] = topicSelects.map(
			(select, index) => new ActionRowBuilder<Select>().addComponents(select),
		);
		topicSelectComponents.push(
			new Buttons(topicSelectCustomId) as ActionRowBuilder<ButtonBuilder>,
		);

		const responseTopic = await interaction.editReply({
			content: "Select a topic. Select none for all topics",
			components: topicSelectComponents,
		});

		const selectedTopics: string[] = [];
		for (let i = 0; i < topicSelects.length; i++) {
			const topic = await responseTopic.awaitMessageComponent({
				time: 60000,
				filter: (i) => i.customId.startsWith(`${topicSelectCustomId}_${i}`),
				componentType: ComponentType.StringSelect,
			});

			selectedTopics.push(...topic.values);
		}

		if (selectedTopics.length === 0) {
			selectedTopics.push(...topicsForSubjects[selectedSubject]);
		}
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
}
