import type { DiscordClient } from "@/registry/DiscordClient";
import { SlashCommandBuilder } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "../../registry/Structure/BaseCommand";

export default class FunFactCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("fun_fact")
				.setDescription("Get a random fun fact"),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const res = await fetch(
			"https://uselessfacts.jsph.pl/random.json?language=en",
		);

		if (!res.ok) {
			await interaction.followUp("Fun fact isn't facting");
			return;
		}

		const data = (await res.json()) as {
			text: string;
		};

		await interaction.followUp(data.text);
	}
}
