import { GuildPreferences } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { ICachedGuildPreferences } from "@/redis/schemas/GuildPreferences";
import {
	ActionRowBuilder,
	type ButtonInteraction,
	MessageFlags,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";

class SetWelcomeModal extends ModalBuilder {
	constructor(
		customId: string,
		guildPreferences: ICachedGuildPreferences | null,
	) {
		super();
		this.setTitle("Set welcome messages").setCustomId(customId);

		const channelMessage = new TextInputBuilder()
			.setCustomId("channelMessage")
			.setLabel("Channel Message (sent in #welcome)")
			.setPlaceholder(
				"{user} just joined {guildName}. We now have {memberCount} members",
			)
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(false)
			.setValue(guildPreferences?.welcomeChannelMessage || "");

		const dmMessage = new TextInputBuilder()
			.setCustomId("dmMessage")
			.setLabel("DM Message (sent to the user in dms)")
			.setPlaceholder("Welcome to {guildName}, {user}!")
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(false)
			.setValue(guildPreferences?.welcomeDMMessage || "");

		const actionRows = [
			new ActionRowBuilder<TextInputBuilder>().addComponents(
				channelMessage,
			),
			new ActionRowBuilder<TextInputBuilder>().addComponents(dmMessage),
		];

		this.addComponents(...actionRows);
	}

	async waitForResponse(
		customId: string,
		interaction: ButtonInteraction,
	): Promise<void> {
		try {
			const followUpInteraction = await interaction.awaitModalSubmit({
				time: 300_000,
				filter: (i) => i.customId === customId,
			});

			const channelMessage =
				followUpInteraction.fields.getTextInputValue("channelMessage");
			const dmMessage =
				followUpInteraction.fields.getTextInputValue("dmMessage");

			if (!interaction.guildId) return;

			if (channelMessage) {
				await GuildPreferences.updateOne(
					{
						guildId: interaction.guildId,
					},
					{
						welcomeChannelMessage: channelMessage,
					},
					{
						upsert: true,
					},
				);
				await GuildPreferencesCache.remove(interaction.guildId);
			}

			if (dmMessage) {
				await GuildPreferences.updateOne(
					{
						guildId: interaction.guildId,
					},
					{
						welcomeDMMessage: dmMessage,
					},
					{
						upsert: true,
					},
				);
				await GuildPreferencesCache.remove(interaction.guildId);
			}

			await followUpInteraction.reply({
				content: "Welcome message(s) have been set",
				flags: MessageFlags.Ephemeral
			});
		} catch (error) {
			return;
		}
	}
}

export default SetWelcomeModal;
