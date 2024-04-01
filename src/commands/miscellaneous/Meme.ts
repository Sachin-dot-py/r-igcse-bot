import { SlashCommandBuilder } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";
import { subreddits } from "@/data";

export default class MemeCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("meme")
				.setDescription("Get a random meme (random subreddit unless specified)")
				.addStringOption((option) =>
					option
						.setName("subreddit")
						.setDescription("From which subreddit")
						.setRequired(false)
						.addChoices(...subreddits.map(x => { name: `r/${x}`, value: x }))
				)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction
	) {
		const subreddit =
			interaction.options.getString("subreddit", false) || subreddits[Math.floor(Math.random() * subreddits.length)];

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
