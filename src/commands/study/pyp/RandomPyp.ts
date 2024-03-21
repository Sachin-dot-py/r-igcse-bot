import type { DiscordClient } from "@/registry/DiscordClient";
import {
	EmbedBuilder,
	SlashCommandBuilder,
	type APIEmbedField
} from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "../../../registry/Structure/BaseCommand";
import { allSubjects } from "@/data";

const variants = ["1", "2", "3"];
const years = ["2018", "2019", "2020", "2021", "2022", "2023"];
const session = ["m", "s", "w"];

const sessionsMap = {
	"m": "March",
	"s": "June",
	"w": "November"
};

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
								value: "IGCSE"
							},
							{
								name: "O-Level",
								value: "O-Level"
							},
							{
								name: "A-Level",
								value: "A-Level"
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
			| "IGCSE"
			| "O-Level"
			| "A-Level";
		const subjectCode = interaction.options.getString("subject_code", true);
		const paperNumber = interaction.options.getString("paper_number", true);

		const subject = allSubjects.find((x) => x.code === subjectCode);
		if (!subject) {
			await interaction.reply({
				content: "Invalid/Unsupported subject code",
				ephemeral: true
			});
			return;
		}

		const randomYear = years[Math.floor(Math.random() * years.length)];
		const randomVariant =
			variants[Math.floor(Math.random() * variants.length)];
		const randomSession = session[
			Math.floor(Math.random() * session.length)
		] as "m" | "s" | "w";

		const paperName = `${subjectCode}_${randomSession}${randomYear.slice(2)}_qp_${paperNumber}${randomVariant}.pdf`;

		const fields: APIEmbedField[] = [
			{
				name: "Question Paper",
				value: `[Open](https://edupapers.store/wp-content/uploads/simple-file-list/${programme}/${subject.name}-${subject.code}/${randomYear}/${sessionsMap[randomSession]}/${paperName})`,
				inline: true
			},
			{
				name: "Mark Scheme",
				value: `[Open](https://edupapers.store/wp-content/uploads/simple-file-list/${programme}/${subject.name}-${subject.code}/${randomYear}/${sessionsMap[randomSession]}/${paperName.replace("qp", "ms")})`,
				inline: true
			}
		];

		if (subject.insert) {
			fields.push({
				name: "Insert/Supporting Files",
				value: `[Open](https://edupapers.store/wp-content/uploads/simple-file-list/${programme}/${subject.name}-${subject.code}/${randomYear}/${sessionsMap[randomSession]}/${paperName.replace("qp", subject.insert)})`,
				inline: true
			});
		}

		await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setTitle("Random Past Paper")
					.setDescription(
						`Here is a random past paper for ${subject.name}`
					)
					.addFields(...fields)
			]
		});
	}
}
