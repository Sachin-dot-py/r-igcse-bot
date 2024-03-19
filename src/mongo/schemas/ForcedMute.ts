import { Schema, model as createModel } from "mongoose";

export interface IForcedMute {
	userId: string;
	guildId: string;
	expiration: Date;
}

const schema = new Schema<IForcedMute>({
	userId: { type: String, required: true, unique: true },
	guildId: { type: String, required: true, unique: false },
	expiration: { type: Date, required: true, unique: false }
});

export const ForcedMute = createModel<IForcedMute>("ForcedMute", schema);
