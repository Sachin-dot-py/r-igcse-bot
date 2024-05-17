import { SlashCommandBuilder } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";
import { getJoke } from "../../utils/apis/joke";
import { type Category as JokeCategory } from "chucklejs";
import type { DiscordClient } from "@/registry/DiscordClient";

export default class JokeCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("joke")
				.setDescription("Get a random joke")
				.addStringOption((option) =>
					option
						.setName("category")
						.setDescription("specify category")
						.addChoices(
							{
								name: "programming",
								value: "Programming"
							},
							{
								name: "pun",
								value: "Pun"
							},
							{
								name: "misc",
								value: "Misc"
							},
							{
								name: "spooky",
								value: "Spooky"
							},
							{
								name: "christmas",
								value: "Christmas"
							}
						)
				)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction
	) {
		const category = interaction.options.getString("category", false);
		const categories: JokeCategory[] = category
			? [category as JokeCategory]
			: ["Misc", "Pun"];

		await interaction.deferReply();

		const joke = (await getJoke(categories))[0];

		interaction.followUp(joke);
	}
}
