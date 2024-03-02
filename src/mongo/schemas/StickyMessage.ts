import type { APIEmbed } from "discord.js";
import { Schema, model as createModel } from "mongoose";

export interface IStickyMessage {
	channelId: string;
	messageId: string | null;
	embeds: APIEmbed[];
	stickTime: string;
	unstickTime: string;
}

const schema = new Schema<IStickyMessage>({
	channelId: { type: String, required: true },
	messageId: { type: String },
	embeds: { type: [Object], required: true },
	stickTime: { type: String, required: true },
	unstickTime: { type: String, required: true },
});

export const StickyMessage = createModel<IStickyMessage>(
	"StickyMessage",
	schema,
);
