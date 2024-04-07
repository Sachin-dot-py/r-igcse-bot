import Pagination from "@/components/Pagination";
import { Keyword } from "@/mongo/schemas/Keyword";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
	Colors,
	EmbedBuilder,
	SlashCommandBuilder,
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

		const paginator = new Pagination(chunks, async (chunk) => {
			const embed = new EmbedBuilder()
				.setTitle("Keywords")
				.setColor(Colors.Blurple)
				.setDescription(
					`Page ${chunks.indexOf(chunk) + 1} of ${chunks.length}`
				);

			for (const { keyword } of chunk)
				embed.addFields({ name: keyword, value: "\n", inline: true });

			return { embeds: [embed] };
		});

		await paginator.start({
			interaction,
			ephemeral: false
		});
	}
}
