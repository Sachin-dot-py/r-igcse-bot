import { SlashCommandBuilder } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";

var subs: string[];
subs = ["memes", "dankmemes", "wholesomememes"]


export default class MemeCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("meme")
				.setDescription("Get a random meme")
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction
	) {

		await interaction.deferReply();
	
		let subreddit = "memes"
		let index = getRandomInt(0, subs.length - 1);
		subreddit = subs[index];

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
function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}