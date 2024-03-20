import { Keyword } from "@/mongo/schemas/Keyword";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Colors,
	ComponentType,
	EmbedBuilder,
	SlashCommandBuilder
} from "discord.js";

export default class ListKeywordsCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("list_keywords")
				.setDescription(
					"Display all the keywords in the current server"
				)
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		if (!interaction.channel || !interaction.channel.isTextBased()) return;

		const keywords = await Keyword.find({
			guildId: interaction.guildId
		});

		if (keywords.length === 0) {
			await interaction.reply({
				content: "There are no keywords in this server",
				ephemeral: true
			});
			return;
		}

		const chunks = Array.from(
			{ length: Math.ceil(keywords.length / 9) },
			(_, i) => keywords.slice(i * 9, i * 9 + 9)
		);

		const embeds: EmbedBuilder[] = [];

		for (const [i, chunk] of chunks.entries()) {
			const embed = new EmbedBuilder()
				.setTitle("Keywords")
				.setColor(Colors.Blurple)
				.setDescription(`Page ${i + 1} of ${chunks.length}`);

			for (const { keyword } of chunk)
				embed.addFields({ name: keyword, value: "\n", inline: true });

			embeds.push(embed);
		}

		let page = 0;

		const firstButton = new ButtonBuilder()
			.setCustomId("first")
			.setEmoji("⏪")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(page === 0);

		const previousButton = new ButtonBuilder()
			.setCustomId("previous")
			.setEmoji("⬅️")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(page === 0);

		const lastButton = new ButtonBuilder()
			.setCustomId("last")
			.setEmoji("⏩")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(page === chunks.length);

		const nextButton = new ButtonBuilder()
			.setCustomId("next")
			.setEmoji("➡️")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(page === chunks.length);

		const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			firstButton,
			previousButton,
			lastButton,
			nextButton
		);

		await interaction.reply({
			embeds: [embeds[page]],
			components: [buttonsRow],
			ephemeral: true
		});

		const collector = interaction.channel.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: (i) => i.user.id === interaction.user.id
		});

		collector.on("collect", async (i) => {
			if (i.customId === "first") page = 0;
			else if (i.customId === "previous") page--;
			else if (i.customId === "next") page++;
			else if (i.customId === "last") page = chunks.length;

			await interaction.editReply({
				embeds: [embeds[page]],
				components: [buttonsRow]
			});
		});
	}
}
