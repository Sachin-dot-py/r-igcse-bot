import { Schema, model as createModel } from "mongoose";

export interface IDmGuildPreference {
	userId: string;
	guildId: string;
}

const schema = new Schema<IDmGuildPreference>({
	userId: { type: String, required: true, unique: true },
	guildId: { type: String, required: true, unique: false },
});

export const DmGuildPreference = createModel<IDmGuildPreference>(
	"DmGuildPreferences",
	schema,
);
