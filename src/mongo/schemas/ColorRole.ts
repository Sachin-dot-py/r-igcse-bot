import { Schema, model as createModel } from "mongoose";

export interface IColorRole {
	guildId: string;
	requirementRoleId: string;
	emoji: string;
	label: string;
	roleId: string;
}

const schema = new Schema<IColorRole>({
	guildId: { type: String, required: true, unique: false },
	requirementRoleId: { type: String, required: false, unique: false },
	emoji: { type: String, required: false, unique: true },
	label: { type: String, required: true, unique: true },
	roleId: { type: String, required: true, unique: true }
});

export const ColorRole = createModel<IColorRole>("ColorRole", schema);
