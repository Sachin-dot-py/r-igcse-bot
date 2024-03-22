import { Schema, model as createModel } from "mongoose";

export interface IKeyword {
	guildId: string;
	keyword: string;
	response: string;
}

const schema = new Schema<IKeyword>({
	guildId: { type: String, required: true, unique: false },
	keyword: { type: String, required: true, unique: false },
	response: { type: String, required: true, unique: false }
});

export const Keyword = createModel<IKeyword>("Keyword", schema);
