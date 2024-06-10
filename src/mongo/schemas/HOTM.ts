import { Schema, model as createModel } from "mongoose";

export interface IHOTM {
	helperId: string;
	guildId: string;
	votes: number;
}

const schema = new Schema<IHOTM>({
	helperId: { type: String, required: true },
	guildId: { type: String, required: true },
	votes: { type: Number, default: 0 },
});

export const HOTM = createModel<IHOTM>("HOTM", schema);
