import type { DiscordClient } from "@/registry/DiscordClient";
import { SlashCommandBuilder } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
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
	"9609",
];

export default class StudySessionCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("study_session")
				.setDescription("Start a study session"),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction,
	) {
		if (interaction.guildId !== "576460042774118420") {
			await interaction.reply({
				content: "Feature not yet implemented for your server.",
				ephemeral: true,
			});

			return;
		}
	}
}
