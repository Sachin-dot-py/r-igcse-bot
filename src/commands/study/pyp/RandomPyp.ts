import { allSubjects } from "@/data";
import type { DiscordClient } from "@/registry/DiscordClient";
import {
	type APIEmbedField,
	ChannelType,
	EmbedBuilder,
	SlashCommandBuilder,
	MessageFlags,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
} from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "../../../registry/Structure/BaseCommand";

const variants = ["1", "2", "3"];
const years = ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"];
const session = ["m", "s", "w"] as const;

const sessionsMap = {
	m: "March",
	s: "May-June",
	w: "Oct-Nov",
} as const;

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
							{ name: "IGCSE", value: "IGCSE" },
							{ name: "O-Level", value: "O-Level" },
							{ name: "A-Level", value: "A-Level" },
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

		const generatePaper = () => {
			const randomYear = years[Math.floor(Math.random() * years.length)];

			const randomSession =
				session[Math.floor(Math.random() * session.length)];

			const randomVariant =
				randomSession === "m"
					? "2"
					: variants[Math.floor(Math.random() * variants.length)];

			const paperName = `${subjectCode}_${randomSession}${randomYear.slice(
				2,
			)}_qp_${paperNumber}${randomVariant}`;

			return { randomYear, randomSession, paperName };
		};

		const buildEmbed = (
			randomYear: string,
			randomSession: "m" | "s" | "w",
			paperName: string,
		) => {
			const fields: APIEmbedField[] = [
				{
					name: "QP Link:",
					value: `[${paperName}](https://pastpapers.co/api/file/caie/${programme}/${subject.name}-${subjectCode}/${randomYear}-${sessionsMap[randomSession]}/${paperName}.pdf)`,
				},
				{
					name: "MS Link:",
					value: `[${paperName.replace(
						"qp",
						"ms",
					)}](https://pastpapers.co/api/file/caie/${programme}/${subject.name}-${subjectCode}/${randomYear}-${sessionsMap[randomSession]}/${paperName.replace(
						"qp",
						"ms",
					)}.pdf)`,
				},
			];

			if (subject.insert) {
				fields.push({
					name: "Insert/Supporting Files:",
					value: `[${paperName.replace(
						"qp",
						subject.insert,
					)}](https://pastpapers.co/api/file/caie/${programme}/${subject.name}-${subjectCode}/${randomYear}-${sessionsMap[randomSession]}/${paperName.replace(
						"qp",
						subject.insert,
					)}.pdf)`,
				});
			}

			return new EmbedBuilder()
				.setTitle(`Random Paper for ${subject.name}`)
				.setDescription(
					`${paperName} has been chosen at random.\n\n${fields
						.map((x) => `**${x.name}**: ${x.value}`)
						.join("\n")}`,
				)
				.setColor(0xf4b6c2);
		};

		let { randomYear, randomSession, paperName } = generatePaper();

		const button = new ButtonBuilder()
			.setCustomId("regen_paper")
			.setLabel("🔄 Regenerate Paper")
			.setStyle(ButtonStyle.Primary);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

		await interaction.reply({
			embeds: [buildEmbed(randomYear, randomSession, paperName)],
			components: [row],
			ephemeral: interaction.channel?.type !== ChannelType.GuildVoice,
		});

		const message = await interaction.fetchReply();

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 120000,
		});

		collector.on("collect", async (i) => {
			if (i.user.id !== interaction.user.id) {
				await i.reply({
					content: "You cannot use this button.",
					ephemeral: true,
				});
				return;
			}

			const newPaper = generatePaper();

			await i.update({
				embeds: [
					buildEmbed(
						newPaper.randomYear,
						newPaper.randomSession,
						newPaper.paperName,
					),
				],
				components: [row],
			});
		});

		collector.on("end", async () => {
			const disabledButton = new ButtonBuilder()
				.setCustomId("regen_paper")
				.setLabel("🔄 Regenerate Paper")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(true);

			const disabledRow =
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					disabledButton,
				);

			await interaction.editReply({
				components: [disabledRow],
			});
		});
	}
}
