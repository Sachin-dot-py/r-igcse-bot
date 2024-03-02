import type { APIEmbed } from "discord.js";
import { Schema, model as createModel } from "mongoose";

export interface IStickyMessage {
	channelId: string;
	messageId: string | null;
	embeds: APIEmbed[];
	stickTime: string;
	unstickTime: string;
	enabled: boolean;
}

const schema = new Schema<IStickyMessage>({
	channelId: { type: String },
	messageId: { type: String, required: false },
	embeds: { type: [Object] },
	stickTime: { type: String },
	unstickTime: { type: String },
	enabled: { type: Boolean },
});

export const StickyMessage = createModel<IStickyMessage>(
	"StickyMessage",
	schema,
);
