import UserSelect from "../UserSelect";
import { ActionRowBuilder } from "discord.js";

class UserSelectView {
	rows: ActionRowBuilder<UserSelect>[];
	constructor(customId: string, ...data: string[]) {
		const userSelect = new UserSelect(
			"users",
			"Select a user",
			25,
			`${customId}_0`
		);

		const row = new ActionRowBuilder<UserSelect>().addComponents(
			userSelect
		);
		this.rows = [row];
	}
}

export default UserSelectView;
