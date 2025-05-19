import {
	ActionRowBuilder,
	type ButtonInteraction,
	type ModalActionRowComponentBuilder,
	ModalBuilder,
	type ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";

interface ConfessionBanModalResponse {
	reason: string;
	followUpInteraction: ModalSubmitInteraction;
}

class ConfessionBanModal extends ModalBuilder {
	constructor(customId: string) {
		super();
		this.setTitle("Are you sure you want to ban this user?").setCustomId(
			customId,
		);

		const reason = new TextInputBuilder()
			.setCustomId("reason")
			.setLabel("Reason")
			.setPlaceholder("very annoying person")
			.setStyle(TextInputStyle.Short)
			.setRequired(true);

		const actionRows = [
			new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
				reason,
			),
		];

		this.addComponents(...actionRows);
	}

	async waitForResponse(
		customId: string,
		interaction: ButtonInteraction,
	): Promise<ConfessionBanModalResponse | false> {
		try {
			const followUpInteraction = await interaction.awaitModalSubmit({
				time: 300_000,
				filter: (i) => i.customId === customId,
			});

			const reason =
				followUpInteraction.fields.getTextInputValue("reason");

			return {
				reason,
				followUpInteraction,
			};
		} catch (error) {
			interaction.followUp({
				content: "You took too long to respond",
				flags: 64,
			});
			return false;
		}
	}
}

export default ConfessionBanModal;
