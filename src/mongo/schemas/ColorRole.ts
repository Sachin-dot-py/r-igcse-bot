import { Schema, model as createModel } from "mongoose";

export interface IColorRole {
	guildId: string;
	label: string;
	roleId: string;
	requirementRoleIds: string[] | null;
	emoji: string | null;
}

const schema = new Schema<IColorRole>({
	guildId: { type: String, required: true, unique: false },
	requirementRoleIds: {
		type: [String],
		required: false,
		default: null,
		unique: false,
	},
	emoji: { type: String, required: false, default: null, unique: false },
	label: { type: String, required: true, unique: false },
	roleId: { type: String, required: true, unique: false },
});

export const ColorRole = createModel<IColorRole>("ColorRole", schema);
