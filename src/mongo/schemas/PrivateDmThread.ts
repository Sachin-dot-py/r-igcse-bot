import { Schema, model as createModel } from "mongoose";

export interface IPrivateDmThread {
	userId: string;
	threadId: string;
	guildId: string;
}

const schema = new Schema<IPrivateDmThread>({
	userId: { type: String, required: true },
	threadId: { type: String, required: true },
	guildId: { type: String, required: true }
});

export const PrivateDmThread = createModel<IPrivateDmThread>(
	"PrivateDmThread",
	schema
);
