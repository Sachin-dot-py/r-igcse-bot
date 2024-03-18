import type { DiscordClient } from "@/registry/DiscordClient";
import { SlashCommandBuilder } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";

const SUBJECT_CODES = [
	"0410",
	"0445",
	"0448",
	"0449",
	"0450",
	"0454",
	"0457",
	"0460",
	"0471",
	"0500",
	"0501",
	"0502",
	"0503",
	"0504",
	"0505",
	"0508",
	"0509",
	"0513",
	"0514",
	"0516",
	"0518",
	"0538",
	"9609"
];

export default class RandomPypCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("random_pyp")
				.setDescription("Gets a random CAIE past paper")
				.addStringOption((option) =>
					option
						.setName("programme")
						.setDescription("IGCSE, O-Levels or A-Levels?")
						.addChoices(
							{
								name: "IGCSE",
								value: "ig"
							},
							{
								name: "O-Level",
								value: "ol"
							},
							{
								name: "A-Level",
								value: "al"
							}
						)
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("subject_code")
						.setDescription("The code for the subject")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("paper_number")
						.setDescription("The paper number")
						.setRequired(true)
				)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction
	) {
		const programme = interaction.options.getString("programme", true) as
			| "ig"
			| "ol"
			| "al";
		const subjectCode = interaction.options.getString("subject_code", true);
		const paperNumber = interaction.options.getString("paper_number", true);

		if (!SUBJECT_CODES.some((code) => code === subjectCode)) {
			await interaction.reply({
				content: "Invalid / Unsupported subject code"
			});

			return;
		}
	}
}
