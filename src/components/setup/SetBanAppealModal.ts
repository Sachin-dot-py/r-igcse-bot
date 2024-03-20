import { GuildPreferences } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import { type ICachedGuildPreferences } from "@/redis/schemas/GuildPreferences";
import {
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	type ButtonInteraction
} from "discord.js";

class SetBanAppealModal extends ModalBuilder {
	constructor(
		customId: string,
		guildPreferences: ICachedGuildPreferences | null
	) {
		super();
		this.setTitle("Set ban appeal link").setCustomId(customId);

		const banAppealLink = new TextInputBuilder()
			.setCustomId("banAppealLink")
			.setLabel("Ban Appeal Link")
			.setPlaceholder("https://forms.google.com/your-ban-appeal-form")
			.setStyle(TextInputStyle.Short)
			.setRequired(false)
			.setValue(guildPreferences?.banAppealFormLink || "");

		const actionRows = [
			new ActionRowBuilder<TextInputBuilder>().addComponents(
				banAppealLink
			)
		];

		this.addComponents(...actionRows);
	}

	async waitForResponse(
		customId: string,
		interaction: ButtonInteraction
	): Promise<void> {
		try {
			const followUpInteraction = await interaction.awaitModalSubmit({
				time: 300_000,
				filter: (i) => i.customId === customId
			});

			const banAppealLink =
				followUpInteraction.fields.getTextInputValue("banAppealLink") ||
				undefined;

			if (banAppealLink && interaction.guildId) {
				await GuildPreferences.updateOne(
					{
						guildId: interaction.guildId
					},
					{
						banAppealFormLink: banAppealLink
					},
					{
						upsert: true
					}
				);
				await GuildPreferencesCache.remove(interaction.guildId);
			}

			await followUpInteraction.reply({
				content: `Ban appeal link has been set to \`${banAppealLink}\``,
				ephemeral: true
			});
		} catch (error) {
			return;
		}
	}
}

export default SetBanAppealModal;
