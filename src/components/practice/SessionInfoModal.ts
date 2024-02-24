import {
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	type ModalActionRowComponentBuilder,
} from "discord.js";

class SessionInfoModal extends ModalBuilder {
	constructor(customId: string) {
		super();
		this.setTitle("Customise this session").setCustomId(customId);

		const minimumYear = new TextInputBuilder()
			.setCustomId("minimum_year")
			.setPlaceholder("Minimum Year")
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setMinLength(4)
			.setMaxLength(4);

		const numberOfQuestions = new TextInputBuilder()
			.setCustomId("number_of_questions")
			.setPlaceholder("Number of Questions (max: 99)")
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
}

export default SessionInfoModal;
