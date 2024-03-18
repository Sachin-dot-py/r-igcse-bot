import Select from "../../Select";
import { ActionRowBuilder, StringSelectMenuOptionBuilder } from "discord.js";

class VisibiltySelect {
	rows: ActionRowBuilder<Select>[];
	constructor(customId: string, ...data: string[]) {
		const visbilitySelect = new Select(
			"visibility",
			"Public or Private session?",
			[
				new StringSelectMenuOptionBuilder()
					.setLabel("Public")
					.setValue("public")
					.setDescription("Anyone can join"),
				new StringSelectMenuOptionBuilder()
					.setLabel("Private")
					.setValue("private")
					.setDescription("Only invited members can join")
			],
			1,
			`${customId}_0`
		);

		const row = new ActionRowBuilder<Select>().addComponents(
			visbilitySelect
		);
		this.rows = [row];
	}
}

export default VisibiltySelect;
