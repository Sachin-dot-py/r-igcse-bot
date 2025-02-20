import { Schema, model as createModel } from "mongoose";

export interface IHOTMBlacklist {
	helperId: string;
	guildId: string;
	permanent: boolean;
}

const schema = new Schema<IHOTM>({
	helperId: { type: String, required: true },
	guildId: { type: String, required: true },
	permanent: { type: Boolean, default: false },
});

export const HOTMBlacklist = createModel<IHOTMBlacklist>(
	"HOTMBlacklist",
	schema,
);
