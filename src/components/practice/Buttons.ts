import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";

class Buttons extends ActionRowBuilder {
	constructor(customId: string) {
		super();

		const confirm = new ButtonBuilder()
			.setCustomId(`confirm_${customId}`)
			.setLabel("Confirm")
			.setStyle(ButtonStyle.Success);

		const cancel = new ButtonBuilder()
			.setCustomId(`cancel_${customId}`)
			.setLabel("Cancel")
			.setStyle(ButtonStyle.Danger);

		this.addComponents(confirm, cancel);
	}
}

export default Buttons;
