import { Schema, model as createModel } from "mongoose";

export type IPunishment = {
	actionAgainst: string;
	actionBy: string;
	when: Date;
	guildId: string;
	caseId: number;
	reason: string;
	points: number;
} & (
	| {
			action: "Warn" | "Kick" | "Remove Timeout" | "Ban" | "Unban" | "Softban";
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
		required: true,
		unique: false,
	},
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
		required: true,
		unique: false,
	},
	points: {
		type: Number,
		required: true,
		unique: false,
	},
	guildId: {
		type: String,
		required: true,
		unique: false,
	},
});

export const Punishment = createModel<IPunishment>("Punishment", schema);
