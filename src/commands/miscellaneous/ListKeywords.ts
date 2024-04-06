import Pagination from "@/components/Pagination";
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
	SlashCommandBuilder,
	type InteractionEditReplyOptions
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

		const pages: InteractionEditReplyOptions[] = [];

		for (const [i, chunk] of chunks.entries()) {
			const embed = new EmbedBuilder()
				.setTitle("Keywords")
				.setColor(Colors.Blurple)
				.setDescription(`Page ${i + 1} of ${chunks.length}`);

			for (const { keyword } of chunk)
				embed.addFields({ name: keyword, value: "\n", inline: true });

			pages.push({ embeds: [embed] });
		}

		const paginator = new Pagination(pages);

		await paginator.start({
			interaction,
			ephemeral: false
		});
	}
}
