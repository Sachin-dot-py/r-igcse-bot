import { Schema, model as createModel } from "mongoose";

export interface IHOTMUser {
	userId: string;
	guildId: string;
	votesLeft: number;
}

const schema = new Schema<IHOTMUser>({
	userId: { type: String, required: true },
	votesLeft: { type: Number, default: 3 },
	guildId: { type: String, required: true }
});

export const HOTMUser = createModel<IHOTMUser>("HOTMUser", schema);
