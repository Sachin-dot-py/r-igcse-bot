import type { DiscordClient } from "@/registry/DiscordClient";
import {
	Colors,
	EmbedBuilder,
	SlashCommandBuilder,
	MessageFlags,
} from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "../../../registry/Structure/BaseCommand";

const typeMap = {
	ms: "Mark Scheme",
	qp: "Question Paper",
	in: "Insert",
	sf: "Supporting Files",
	er: "Examiner Report",
	gt: "Grade Thresholds",
};

interface PaperScResponseItem {
	doc: {
		subject: string;
		time: string;
		type: keyof typeof typeMap;
		paper: number;
		variant: number;
		_id: string;
	};
	index: {
		page: number;
	};
	related:
		| {
				fileType: string;
				numPages: number;
				_id: string;
				type: keyof typeof typeMap;
		  }[]
		| undefined;
}

export default class ResourcesCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("search_pyp")
				.setDescription(
					"Search for IGCSE past papers with subject code/question text",
				)
				.addStringOption((option) =>
					option
						.setName("query")
						.setDescription("Search Query")
						.setRequired(true),
				),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction,
	) {
		const query = interaction.options.getString("query", true);

		await interaction.deferReply();

		try {
			const res = await fetch(
				`https://paper.sc/search/?as=json&query=${query}`,
			);

			if (!res.ok) throw Error(res.statusText);

			const { list } = (await res.json()) as {
				response: "text";
				list: unknown[];
			};

			if (list?.length === 0) {
				interaction.followUp({
					content:
						"No results found in past papers. Try changing your query for better results.",
					flags: MessageFlags.Ephemeral,
				});

				return;
			}

			const fields = [];

			for (const item of (list as PaperScResponseItem[]).slice(0, 6)) {
				const { subject, time, type, paper, variant, _id } = item.doc;
				let value = `[${typeMap[type]}](https://paper.sc/doc/${_id})`;
				if (item.related) {
					for (const related of item.related) {
						value += `\n[${typeMap[related.type]}](https://paper.sc/doc/${related._id})`;
					}
				}
				fields.push({
					name: `${subject}_${time}_${type}_${paper}${variant} on page ${item.index.page}`,
					value,
				});
			}

			const embed = new EmbedBuilder()
				.setTitle("Potential Match")
				.setDescription("Your question matched a past paper question!")
				.setColor(Colors.Green)
				.addFields(...fields);

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			await interaction.editReply({
				content: "Error occured while searching past papers",
			});

			if (!interaction.inCachedGuild()) return;

			client.log(
				error,
				`${this.data.name} Command`,
				`**Channel:** <#${interaction.channel?.id}>
					**User:** <@${interaction.user.id}>
					**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
			);
		}
	}
}
