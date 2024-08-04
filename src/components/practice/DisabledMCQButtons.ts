import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

class DisabledMCQButtons extends ActionRowBuilder {
	constructor(customId: string, correctAnswer: string | string[]) {
		super();
		const buttonLabels = ["A", "B", "C", "D"];

		for (const label of buttonLabels) {
			const button = new ButtonBuilder()
				.setCustomId(`${label}_${customId}_disabled`)
				.setLabel(label)
				.setStyle(
					label === correctAnswer
						? ButtonStyle.Success
						: ButtonStyle.Danger,
				)
				.setDisabled(true);
			this.addComponents(button);
		}
	}
}

export default DisabledMCQButtons;
