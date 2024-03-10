import {
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	type ModalActionRowComponentBuilder,
	ModalSubmitInteraction,
} from "discord.js";
import type { DiscordChatInputCommandInteraction } from "@/registry/Structure/BaseCommand";

interface SessionInfoModalResponse {
	minimumYear: number;
	numberOfQuestions: number;
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
			.setMaxLength(4);

		const numberOfQuestions = new TextInputBuilder()
			.setCustomId("number_of_questions")
			.setLabel("Number of Questions (max: 99)")
			.setPlaceholder("10")
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setMinLength(1)
			.setMaxLength(2);

		const actionRows = [
			new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
				minimumYear,
			),
			new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
				numberOfQuestions,
			),
		];

		this.addComponents(...actionRows);
	}

	async waitForResponse(customId: string, interaction: DiscordChatInputCommandInteraction): Promise<SessionInfoModalResponse | false>  {
		try {
			const sessionInfo = await interaction.awaitModalSubmit({
				time: 300_000,
				filter: (i) => i.customId === customId,
			});

			const minimumYear = sessionInfo.fields.getTextInputValue("minimum_year");
			const numberOfQuestions = sessionInfo.fields.getTextInputValue("number_of_questions");

			return {
				minimumYear: parseInt(minimumYear),
				numberOfQuestions: parseInt(numberOfQuestions),
				followUpInteraction: sessionInfo,
			}
			
		} catch (error) {
			interaction.followUp({
				content: "You took too long to respond",
				ephemeral: true,
			});
			return false;
		}
	}
}

export default SessionInfoModal;
