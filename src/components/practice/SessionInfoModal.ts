import type { DiscordChatInputCommandInteraction } from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	type ModalActionRowComponentBuilder,
	ModalBuilder,
	type ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
	MessageFlags,
} from "discord.js";

interface SessionInfoModalResponse {
	minimumYear: number;
	numberOfQuestions: number;
	timeLimit: number | null;
	followUpInteraction: ModalSubmitInteraction;
}

class SessionInfoModal extends ModalBuilder {
	constructor(customId: string) {
		super();
		this.setTitle("Customise this session").setCustomId(customId);

		const minimumYear = new TextInputBuilder()
			.setCustomId("minimum_year")
			.setLabel("Minimum Year")
			.setPlaceholder("2018")
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setMinLength(4)
			.setMaxLength(4)
			.setValue("2018");

		const numberOfQuestions = new TextInputBuilder()
			.setCustomId("number_of_questions")
			.setLabel("Number of Questions (max: 99)")
			.setPlaceholder("10")
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setMinLength(1)
			.setMaxLength(2)
			.setValue("10");

		const timeLimit = new TextInputBuilder()
			.setCustomId("time_limit")
			.setLabel("Time Limit per Question (in minutes)")
			.setPlaceholder("Optional")
			.setStyle(TextInputStyle.Short)
			.setRequired(false)
			.setMinLength(1)
			.setMaxLength(5);

		const actionRows = [
			new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
				minimumYear,
			),
			new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
				numberOfQuestions,
			),
			new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
				timeLimit,
			),
		];

		this.addComponents(...actionRows);
	}

	async waitForResponse(
		customId: string,
		interaction: DiscordChatInputCommandInteraction,
	): Promise<SessionInfoModalResponse | false> {
		try {
			const sessionInfo = await interaction.awaitModalSubmit({
				time: 300_000,
				filter: (i) => i.customId === customId,
			});

			const minimumYear =
				sessionInfo.fields.getTextInputValue("minimum_year");
			const numberOfQuestions = sessionInfo.fields.getTextInputValue(
				"number_of_questions",
			);
			const timeLimit =
				sessionInfo.fields.getTextInputValue("time_limit");

			return {
				minimumYear: Number.parseInt(minimumYear),
				numberOfQuestions: Number.parseInt(numberOfQuestions),
				timeLimit: Number.parseFloat(timeLimit) || null,
				followUpInteraction: sessionInfo,
			};
		} catch (error) {
			interaction.followUp({
				content: "You took too long to respond",
				flags: MessageFlags.Ephemeral
			});
			return false;
		}
	}
}

export default SessionInfoModal;
