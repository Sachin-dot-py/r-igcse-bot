import Select from "../../Select";
import { v4 as uuidv4 } from "uuid";
import { practiceSubjects } from "@/data";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	StringSelectMenuOptionBuilder,
	type AnyComponent
} from "discord.js";

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
