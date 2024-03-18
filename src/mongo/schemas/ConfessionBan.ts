import { Schema, model as createModel } from "mongoose";

export interface IConfessionBan {
	userHash: string;
	guildId: string;
	reason: string;
}

const schema = new Schema<IConfessionBan>({
	userHash: { type: String, required: true },
	guildId: { type: String, required: true },
	reason: { type: String, required: true }
});

export const ConfessionBan = createModel<IConfessionBan>(
	"ConfessionBan",
	schema
);
