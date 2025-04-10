import { Schema, model as createModel } from "mongoose";

export type IModNote = {
	actionAgainst: string;
	actionBy: string;
	when: Date;
	guildId: string;
	note: string;
};

const schema = new Schema<IModNote>({
	actionAgainst: {
		type: String,
		required: true,
		unique: false,
	},
	actionBy: {
		type: String,
		required: true,
		unique: false,
	},
	note: {
		type: String,
		required: true,
		unique: false,
	},
	when: {
		type: Date,
		required: true,
		unique: false,
	},
	guildId: {
		type: String,
		required: true,
		unique: false,
	},
});

export const ModNote = createModel<IModNote>("ModNote", schema);
