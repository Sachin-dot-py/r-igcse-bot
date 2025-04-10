import { Schema, model as createModel } from "mongoose";

export interface IApplication {
	guildId: string;
	name: string;
	description: string;
	emoji?: string;
	questions: string[];
	requiredRoles?: string[];
	submissionChannelId: string;
}

const schema = new Schema<IApplication>({
	guildId: { type: String, required: true },
	name: { type: String, required: true },
	description: { type: String, required: true },
	emoji: { type: String, default: null },
	questions: { type: [String], required: true },
	requiredRoles: { type: [String], default: null },
	submissionChannelId: { type: String, required: true },
});

export const Application = createModel<IApplication>("Application", schema);
