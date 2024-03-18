import Select from "../../Select";
import { subjectTopics } from "@/data";
import { ActionRowBuilder, StringSelectMenuOptionBuilder } from "discord.js";

class TopicSelect {
	rows: ActionRowBuilder<Select>[];
	constructor(customId: string, ...data: string[]) {
		this.rows = [];
		const topicSelectOptions = this.getTopics(data[0]);
		const topicRows = this.getTopicRows(topicSelectOptions, customId);
		this.rows.push(...topicRows);
	}

	private getTopics(subject: string): StringSelectMenuOptionBuilder[] {
		return subjectTopics[subject].map((topic) =>
			new StringSelectMenuOptionBuilder().setLabel(topic).setValue(topic)
		);
	}

	private getTopicRows(
		topicSelectOptions: StringSelectMenuOptionBuilder[],
		customId: string
	): ActionRowBuilder<Select>[] {
		const topicRows: ActionRowBuilder<Select>[] = [];
		for (let i = 0; i < topicSelectOptions.length; i += 25) {
			const topicSelect = new Select(
				`topic_${i / 25}`,
				`Select a topic (page ${(i + 25) / 25})`,
				topicSelectOptions.slice(i, i + 25),
				topicSelectOptions.length - i > 25
					? 25
					: topicSelectOptions.length - i,
				`${customId}_${i / 25}`
			);
			const row = new ActionRowBuilder<Select>().addComponents(
				topicSelect
			);
			topicRows.push(row);
		}
		return topicRows;
	}
}

export default TopicSelect;
