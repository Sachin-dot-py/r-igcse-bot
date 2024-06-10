import type { APIEmbed } from "discord.js";
import { Schema, model as createModel } from "mongoose";

export interface IStickyMessage {
	channelId: string;
	messageId: string | null;
	message: { content: string; embeds: APIEmbed[] };
	stickTime: string | null;
	unstickTime: string | null;
}

const schema = new Schema<IStickyMessage>({
	channelId: { type: String, required: true, unique: false },
	messageId: { type: String, required: false, unique: false },
	message: { type: Object, required: true, unique: false },
	stickTime: { type: String, required: false, unique: false },
	unstickTime: { type: String, required: false, unique: false },
});

export const StickyMessage = createModel<IStickyMessage>(
	"StickyMessage",
	schema,
);
