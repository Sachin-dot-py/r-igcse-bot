import { Schema, model as createModel } from "mongoose";

export interface IReputation {
	userId: string;
	rep: number;
	guildId: string;
}

const schema = new Schema<IReputation>({
	userId: { type: String, required: true },
	rep: { type: Number, required: true },
	guildId: { type: String, required: true },
});

export const Reputation = createModel<IReputation>("Reputation", schema);
