import { Schema, model as createModel } from "mongoose";

export interface IClosedDmThread {
	userId: string;
	threadId: string;
	guildId: string;
}

const schema = new Schema<IClosedDmThread>({
	userId: { type: String, required: true },
	threadId: { type: String, required: true },
	guildId: { type: String, required: true }
});

export const ClosedDmThread = createModel<IClosedDmThread>(
	"ClosedDmThread",
	schema
);