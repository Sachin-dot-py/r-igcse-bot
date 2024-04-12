import { Schema, model as createModel } from "mongoose";

export interface IHOTMSession {
	guildId: string;
	startDate: Date;
	endDate: Date;
}

const schema = new Schema<IHOTMSession>({
	guildId: { type: String, required: true, unique: true },
	startDate: { type: Date, required: true, unique: false },
	endDate: { type: Date, required: true, unique: false }
});

export const HOTMSession = createModel<IHOTMSession>("HOTMSession", schema);
