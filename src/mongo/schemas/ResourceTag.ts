import { Schema, model as createModel } from "mongoose";

export interface IResourceTag {
	guildId: string;
	title: string;
	description: string;
	authorId: string;
	channelId: string;
	messageUrl: string;
}

const schema = new Schema<IResourceTag>({
	guildId: { type: String, required: true, unique: false },
	title: { type: String, required: true, unique: false },
	description: { type: String, required: true, unique: false },
	authorId: { type: String, required: true, unique: false },
	channelId: { type: String, required: true, unique: false },
	messageUrl: { type: String, required: true, unique: false },
});

export const ResourceTag = createModel<IResourceTag>("ResourceTag", schema);
