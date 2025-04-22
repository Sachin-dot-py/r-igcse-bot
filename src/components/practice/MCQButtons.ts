import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

class MCQButtons extends ActionRowBuilder {
	constructor(customId: string) {
		super();
		const buttonLabels = ["A", "B", "C", "D"];

		for (const label of buttonLabels) {
			const button = new ButtonBuilder()
				.setCustomId(`${label}_${customId}`)
				.setLabel(label)
				.setStyle(ButtonStyle.Primary);
			this.addComponents(button);
		}
	}
}

export default MCQButtons;
