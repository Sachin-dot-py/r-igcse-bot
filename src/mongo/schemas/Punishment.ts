import { Schema, model as createModel } from "mongoose";

export type IPunishment = {
	actionAgainst: number;
	actionBy: number;
	when: Date;
	points: number;
	guildId: string;
	caseId: number;
	reason: string;
} & (
	| {
			action: "Warn" | "Kick" | "Ban" | "Unban" | "Remove Timeout";
			duration: null;
	  }
	| {
			action: "Timeout";
			duration: number;
	  }
);

const schema = new Schema<IPunishment>({
	caseId: {
		type: Number,
		required: false,
		unique: false,
	},
	actionAgainst: {
		type: Number,
		required: true,
		unique: false,
	},
	actionBy: {
		type: Number,
		required: true,
		unique: false,
	},
	reason: {
		type: String,
		required: false,
		unique: false,
	},
	action: {
		type: String,
		required: true,
		unique: false,
	},
	duration: {
		type: Number,
		required: false,
		unique: false,
	},
	when: {
		type: Date,
		required: false,
		unique: false,
		default: new Date(),
	},
	points: {
		type: Number,
		required: false,
		unique: false,
	},
	guildId: {
		type: String,
		required: true,
		unique: false,
	},
});

export const Punishment = createModel<IPunishment>("Punishment", schema);
