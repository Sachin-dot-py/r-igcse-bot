import { SlashCommandBuilder } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";

const subs = ["memes", "dankmemes", "wholesomememes"]

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
						.setChoices(
							{
								name: "random",
								value: "random"
							},
							{
								name: "r/memes",
								value: "memes"
							},
							{
								name: "r/dankmemes",
								value: "dankmemes"
							},
							{
								name: "r/wholesomememes",
								value: "wholesomememes"
							}
						)
						.setRequired(true)
				),
			true
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction
	) {
		var subreddit =
			interaction.options.getString("subreddit", true) || "";
		await interaction.deferReply();

		if (subreddit === "random") {
			subreddit = subs[Math.floor(Math.random() * subs.length)];
		}
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
