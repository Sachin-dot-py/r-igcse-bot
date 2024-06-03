import type { DiscordClient } from "@/registry/DiscordClient";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder
} from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";
import { resourceRepositories } from "@/data";

export default class ResourcesCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("resources")
				.setDescription("View the r/igcse resources repository")
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction
	) {
		if (!interaction.channel) return;

		const levelSelect = new StringSelectMenuBuilder()
			.setCustomId("level")
			.setPlaceholder("Choose a level...")
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel("IGCSE")
					.setValue("ig"),
				new StringSelectMenuOptionBuilder()
					.setLabel("AS / A Level")
					.setValue("al")
			)
			.setMaxValues(1)
			.setMinValues(1);

		const levelRow =
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				levelSelect
			);

		const selectInteraction = await interaction.reply({
			components: [levelRow],
			content: "Choose a level to view resources for"
		});

		let level: "ig" | "al" = "ig";

		const collector = selectInteraction.createMessageComponentCollector({
			filter: (i) => i.user.id === interaction.user.id,
			componentType: ComponentType.StringSelect,
			time: 300_000
		});

		collector.on("collect", async (i: StringSelectMenuInteraction) => {
			await i.deferUpdate();

			switch (i.customId) {
				case "level": {
					level = i.values[0] as "ig" | "al";

					const subjectSelect = new StringSelectMenuBuilder()
						.setCustomId("subject_group")
						.setPlaceholder("Choose a subject group...")
						.addOptions(
							Object.keys(resourceRepositories[level]).map(
								(subject) =>
									new StringSelectMenuOptionBuilder()
										.setLabel(subject)
										.setValue(subject)
							)
						)
						.setMinValues(1)
						.setMaxValues(1);

					const selectRow =
						new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
							subjectSelect
						);

					interaction.editReply({
						components: [selectRow],
						content: "Choose a subject group"
					});

					break;
				}

				case "subject_group": {
					const resourceRows = [new ActionRowBuilder<ButtonBuilder>().addComponents(
						Object.entries(
							resourceRepositories[level][i.values[0]]
						).slice(0, 5).map(([label, link]) =>
							new ButtonBuilder()
								.setLabel(label)
								.setURL(link)
								.setStyle(ButtonStyle.Link)
						)
					)];
					if (Object.entries(resourceRepositories[level][i.values[0]]).length > 5)
						resourceRows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
							Object.entries(
								resourceRepositories[level][i.values[0]]
							).slice(5, 10).map(([label, link]) =>
								new ButtonBuilder()
									.setLabel(label)
									.setURL(link)
									.setStyle(ButtonStyle.Link)
							)
						))
					if (Object.entries(resourceRepositories[level][i.values[0]]).length > 10)
						resourceRows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
							Object.entries(
								resourceRepositories[level][i.values[0]]
							).slice(10).map(([label, link]) =>
								new ButtonBuilder()
									.setLabel(label)
									.setURL(link)
									.setStyle(ButtonStyle.Link)
							)
						))
					interaction.editReply({
						components: resourceRows
					});

					break;
				}

				default:
					break;
			}
		});
	}
}
