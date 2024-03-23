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
	TextChannel,
	TextInputBuilder,
	TextInputStyle
} from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";
import Select from "@/components/Select";
import { v4 as uuidv4 } from "uuid";

export default class ApplyCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("apply")
				.setDescription("Apply for positions in the server"),
			true
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		if (interaction.guildId !== process.env.MAIN_GUILD_ID) {
			await interaction.reply({
				content: "Feature not yet implemented for your server.",
				ephemeral: true
			});

			return;
		}

		const options = [
			new StringSelectMenuOptionBuilder()
				.setLabel("Chat Moderator")
				.setValue("chat_mod")
				.setEmoji("🗨️")
		];

		if (
			interaction.guildId === process.env.MAIN_GUILD_ID &&
			(interaction.member.roles.cache.has("884026286975115314") ||
				interaction.member.roles.cache.has("696415516893380700") ||
				interaction.member.roles.cache.has("789772710027984926") ||
				interaction.member.roles.cache.has("869584464324468786"))
		) {
			options.push(
				new StringSelectMenuOptionBuilder()
					.setLabel("Debate Competition")
					.setValue("debate_comp")
					.setEmoji("🎤")
			);
		}

		const customId = uuidv4();
		const positionSelect = new StringSelectMenuBuilder()
			.setCustomId(`${customId}_0`)
			.setPlaceholder("Select a position")
			.addOptions(options);

		const row =
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				positionSelect
			);

		const message = await interaction.reply({
			components: [row],
			ephemeral: true,
			fetchReply: true
		});

		const collector = await message.createMessageComponentCollector({
			filter: (i) =>
				i.customId.startsWith(customId) &&
				i.user.id === interaction.user.id,
			time: 600_000,
			componentType: ComponentType.StringSelect
		});

		collector.on("collect", async (i) => {
			const customId = i.customId.split("_")[1];
			const position = i.values[0];

			switch (position) {
				case "chat_mod": {
					const timezoneInput = new TextInputBuilder()
						.setPlaceholder("GMT+5:30")
						.setStyle(TextInputStyle.Short)
						.setLabel("Enter your timezone")
						.setRequired(true)
						.setCustomId("timezone");

					const row =
						new ActionRowBuilder<TextInputBuilder>().addComponents(
							timezoneInput
						);

					const modal = new ModalBuilder()
						.setTitle("Chat Moderator Application")
						.setCustomId(customId)
						.addComponents(row);

					await i.showModal(modal);

					const modalInteraction = await i.awaitModalSubmit({
						time: 600_000
					});

					if (!modalInteraction) return;

					const timezone =
						modalInteraction.fields.getTextInputValue("timezone");

					const embed = new EmbedBuilder()
						.setTitle("Chat Moderator Application")
						.setDescription(
							`Submitted by ${interaction.user.tag} (${interaction.user.id})`
						)
						.addFields({
							name: "Timezone",
							value: timezone
						})
						.setTimestamp();

					const chatModChannel =
						await interaction.guild?.channels.cache.get(
							process.env.CHAT_MOD_APPS_CHANNEL_ID
						);

					if (!(chatModChannel instanceof TextChannel)) return;

					await chatModChannel.send({
						embeds: [embed]
					});

					await modalInteraction.reply({
						content: "Submitted Chat Moderator Application",
						ephemeral: true
					});

					break;
				}
				case "debate_comp": {
					const embed = new EmbedBuilder()
						.setTitle("Debate Competition")
						.setDescription(
							`Submitted by ${interaction.user.tag} (${interaction.user.id})`
						)
						.setTimestamp();

					const debateCompChannel =
						await interaction.guild?.channels.cache.get(
							process.env.DEBATE_APPS_CHANNEL_ID
						);

					if (!(debateCompChannel instanceof TextChannel)) return;

					await debateCompChannel.send({
						embeds: [embed]
					});

					await i.reply({
						content: "Submitted Debate Competition Application.",
						ephemeral: true
					});

					break;
				}
			}
		});
	}
}
