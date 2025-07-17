import { allSubjects } from "@/data";
import type { DiscordClient } from "@/registry/DiscordClient";
import {
	type APIEmbedField,
	ChannelType,
	EmbedBuilder,
	SlashCommandBuilder,
	MessageFlags,
} from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "../../../registry/Structure/BaseCommand";

const variants = ["1", "2", "3"];
const years = ["2018", "2019", "2020", "2021", "2022", "2023"];
const session = ["m", "s", "w"];

const sessionsMap = {
	m: "March",
	s: "June",
	w: "November",
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
								value: "IGCSE",
							},
							{
								name: "O-Level",
								value: "O-Level",
							},
							{
								name: "A-Level",
								value: "A-Level",
							},
						)
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("subject_code")
						.setDescription("The code for the subject")
						.setRequired(true),
				)
				.addIntegerOption((option) =>
					option
						.setName("paper_number")
						.setDescription("The paper number")
						.setRequired(true),
				),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction,
	) {
		const programme = interaction.options.getString("programme", true) as
			| "IGCSE"
			| "O-Level"
			| "A-Level";
		const subjectCode = interaction.options.getString("subject_code", true);
		const paperNumber = interaction.options.getInteger(
			"paper_number",
			true,
		);

		const subject = allSubjects.find((x) => x.code === subjectCode);
		if (!subject) {
			await interaction.reply({
				content: "Invalid/Unsupported subject code",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		if (paperNumber > 6 || paperNumber < 1) {
			await interaction.reply({
				content: `Invalid paper number\n${
					paperNumber > 9
						? "Hint: Don't enter the variant number"
						: "Hint: Paper numbers are between 1 and 6, inclusive."
				}`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const randomYear = years[Math.floor(Math.random() * years.length)];
		const randomVariant =
			variants[Math.floor(Math.random() * variants.length)];
		const randomSession = session[
			Math.floor(Math.random() * session.length)
		] as "m" | "s" | "w";

		const paperName = `${subjectCode}_${randomSession}${randomYear.slice(2)}_qp_${paperNumber}${randomVariant}`;

		const fields: APIEmbedField[] = [
			{
				name: "QP Link:",
				value: `[${paperName}](https://edupapers.store/wp-content/uploads/simple-file-list/${programme}/${subject.name}-${subject.code}/${randomYear}/${sessionsMap[randomSession]}/${paperName}.pdf)`,
				// inline: true
			},
			{
				name: "MS Link:",
				value: `[${paperName.replace("qp", "ms")}](https://edupapers.store/wp-content/uploads/simple-file-list/${programme}/${subject.name}-${subject.code}/${randomYear}/${sessionsMap[randomSession]}/${paperName.replace("qp", "ms")}.pdf)`,
				// inline: true
			},
		];

		if (subject.insert) {
			fields.push({
				name: "Insert/Supporting Files:",
				value: `[${paperName.replace("qp", subject.insert)}](https://edupapers.store/wp-content/uploads/simple-file-list/${programme}/${subject.name}-${subject.code}/${randomYear}/${sessionsMap[randomSession]}/${paperName.replace("qp", subject.insert)}.pdf)`,
				// inline: true
			});
		}

		await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setTitle(`Random Paper for ${subject.name}`)
					.setDescription(
						`${paperName} has been chosen at random. Below are links to the question paper and marking scheme.\n\n${fields
							.map((x) => `**${x.name}**: ${x.value}`)
							.join("\n")}`,
					)
					.setColor(0xf4b6c2),
			],
			ephemeral: interaction.channel?.type !== ChannelType.GuildVoice,
		});
	}
}
