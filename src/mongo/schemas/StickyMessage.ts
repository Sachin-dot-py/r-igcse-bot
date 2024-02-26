import type { APIEmbed } from "discord.js";
import { Schema, model as createModel } from "mongoose";

export interface IStickyMessage {
	channelId: string;
	messageId: string | null;
	embed: APIEmbed;
	stickTime: string;
	unstickTime: string;
}

const schema = new Schema<IStickyMessage>({
	channelId: { type: String, required: true },
	messageId: { type: String },
	embed: { type: Object, required: true },
	stickTime: { type: String, required: true },
	unstickTime: { type: String, required: true },
});

export const StickyMessage = createModel<IStickyMessage>(
	"StickyMessage",
	schema,
);
