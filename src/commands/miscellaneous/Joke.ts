import { SlashCommandBuilder } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "../../registry/Structure/BaseCommand";
import { getJoke } from "../../utils/apis/joke";
import { type Category as JokeCategory } from "chucklejs";

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
								value: "Programming",
							},
							{
								name: "dark",
								value: "Dark",
							},
							{
								name: "pun",
								value: "Pun",
							},
							{
								name: "misc",
								value: "Misc",
							},
							{
								name: "spooky",
								value: "Spooky",
							},
							{
								name: "christmas",
								value: "Christmas",
							},
						),
				),
		);
	}

	async execute(
		interaction: DiscordChatInputCommandInteraction,
		client: DiscordClient,
	) {
		const category = interaction.options.getString("category", false);
		const categories: JokeCategory[] = category
			? [category as JokeCategory]
			: ["Misc", "Dark", "Pun"];

		await interaction.deferReply();

		const joke = (await getJoke(categories))[0];

		await interaction.followUp(joke);
	}
}
