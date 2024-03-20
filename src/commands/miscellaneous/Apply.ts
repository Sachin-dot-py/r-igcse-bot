import type { DiscordClient } from "@/registry/DiscordClient";
import {
	ActionRowBuilder,
	ComponentType,
	EmbedBuilder,
	ModalBuilder,
	ModalSubmitInteraction,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	TextInputBuilder,
	TextInputStyle
} from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";

export default class ApplyCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("apply")
				.setDescription("Apply for positions in the server")
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const positionSelect = new StringSelectMenuBuilder()
			.setCustomId("position_select")
			.setPlaceholder("Position to Apply for...")
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel("Chat Moderator")
					.setValue("chat_mod")
			);

		const row =
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				positionSelect
			);

		const message = await interaction.reply({
			components: [row]
		});

		message
			.awaitMessageComponent({
				filter: (i: StringSelectMenuInteraction) =>
					i.customId === "chat_mod" &&
					i.user.id === interaction.user.id,
				componentType: ComponentType.StringSelect
			})
			.then(async () => {
				const timezoneInput = new TextInputBuilder()
					.setCustomId("timezone_input")
					.setLabel("Timezone")
					.setStyle(TextInputStyle.Short)
					.setPlaceholder(
						"Please specify your timezone in UTC/GMT time"
					)
					.setRequired(true);

				const row =
					new ActionRowBuilder<TextInputBuilder>().addComponents(
						timezoneInput
					);

				const modal = new ModalBuilder()
					.setTitle("Chat Moderator Application")
					.setCustomId("chat_mod_app")
					.addComponents(row);

				await interaction.showModal(modal);

				interaction
					.awaitModalSubmit({
						filter: (i: ModalSubmitInteraction) =>
							i.customId === "chat_mod_app" &&
							i.user.id === interaction.user.id,
						time: 90000
					})
					.then(async (i) => {
						const timezone =
							i.fields.getTextInputValue("timezone_input");

						const chatModAppsChannelId = "1070571771423621191";
						const chatModAppsChannel =
							interaction.guild.channels.cache.get(
								chatModAppsChannelId
							);

						if (
							!chatModAppsChannel ||
							!chatModAppsChannel.isTextBased()
						) {
							await interaction.editReply({
								content:
									"Error occured whilst processing application. Please try again later."
							});

							return;
						}

						const embed = new EmbedBuilder()
							.setAuthor({
								name: "Chat Mod Application",
								iconURL: interaction.user.displayAvatarURL()
							})
							.addFields(
								{
									name: "Name",
									value: interaction.user.tag
								},
								{
									name: "Timezone",
									value: timezone
								}
							);

						await chatModAppsChannel.send({
							embeds: [embed]
						});

						await interaction.editReply({
							content:
								"Thank you for applying. If you are selected as a Chat Moderator, we will send you a modmail with more information. Good luck!"
						});
					});
			});
	}
}
