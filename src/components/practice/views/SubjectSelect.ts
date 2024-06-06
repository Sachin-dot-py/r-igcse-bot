import { practiceSubjects } from "@/data";
import { ActionRowBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import Select from "../../Select";

class SubjectSelect {
	rows: ActionRowBuilder<Select>[];
	constructor(customId: string) {
		const subjectSelect = new Select(
			"subject",
			"Select a subject",
			this.getSubjects(),
			1,
			`${customId}_0`,
		);

		const row = new ActionRowBuilder<Select>().addComponents(subjectSelect);
		this.rows = [row];
	}

	private getSubjects(): StringSelectMenuOptionBuilder[] {
		return Object.entries(practiceSubjects).map(([key, value]) =>
			new StringSelectMenuOptionBuilder()
				.setLabel(`${value} (${key})`)
				.setValue(key),
		);
	}
}

export default SubjectSelect;
