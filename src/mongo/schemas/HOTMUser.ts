import { Schema, model as createModel } from "mongoose";

export interface IHOTMUser {
	userId: string;
	guildId: string;
	voted: string[];
}

const schema = new Schema<IHOTMUser>({
	userId: { type: String, required: true },
	voted: { type: [String], default: [] },
	guildId: { type: String, required: true },
});

export const HOTMUser = createModel<IHOTMUser>("HOTMUser", schema);
