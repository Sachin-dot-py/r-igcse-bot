import { Schema, model as createModel } from "mongoose";

export interface IKeyword {
	guildId: string;
	keyword: string;
	response: string;
	imageLink: string | undefined;
}

const schema = new Schema<IKeyword>({
	guildId: { type: String, required: true, unique: false },
	keyword: { type: String, required: true, unique: true },
	response: { type: String, required: true, unique: false },
	imageLink: { type: String, required: false, unique: false },
});

export const Keyword = createModel<IKeyword>("Keyword", schema);
