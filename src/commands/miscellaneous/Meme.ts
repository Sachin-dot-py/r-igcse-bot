import { SlashCommandBuilder } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";

export default class MemeCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("meme")
				.setDescription("Get a random meme")
				.addStringOption((option) =>
					option
						.setName("subreddit")
						.setDescription("From which subreddit")
						.setRequired(false)
				)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction
	) {
		const subreddit =
			interaction.options.getString("subreddit", false) || "";

		await interaction.deferReply();

		const res = await fetch(`https://meme-api.com/gimme/${subreddit}`);

		if (!res.ok) {
			await interaction.followUp("No meme found");
			return;
		}

		const data = (await res.json()) as {
			url: string;
		};

		await interaction.followUp(data.url);
	}
}
