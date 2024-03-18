import Select from "../../Select";
import { practiceSubjects } from "@/data";
import { ActionRowBuilder, StringSelectMenuOptionBuilder } from "discord.js";

class SubjectSelect {
	rows: ActionRowBuilder<Select>[];
	constructor(customId: string, ...data: string[]) {
		const subjectSelect = new Select(
			"subject",
			"Select a subject",
			this.getSubjects(),
			1,
			`${customId}_0`
		);

		const row = new ActionRowBuilder<Select>().addComponents(subjectSelect);
		this.rows = [row];
	}

	private getSubjects(): StringSelectMenuOptionBuilder[] {
		return Object.entries(practiceSubjects).map(([key, value]) =>
			new StringSelectMenuOptionBuilder()
				.setLabel(`${value} (${key})`)
				.setValue(key)
		);
	}
}

export default SubjectSelect;
