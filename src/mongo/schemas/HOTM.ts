import { Schema, model as createModel } from "mongoose";

export interface IHOTM {
	helperId: string;
	guildId: string;
	voterIds: string[];
}

const schema = new Schema<IHOTM>({
	helperId: { type: String, required: true },
	guildId: { type: String, required: true },
	voterIds: { type: [String], required: true }
});

export const HOTM = createModel<IHOTM>("HOTM", schema);
