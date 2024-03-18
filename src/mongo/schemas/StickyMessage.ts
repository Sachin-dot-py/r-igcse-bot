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
	channelId: { type: String, required: true, unique: false },
	messageId: { type: String, required: false, unique: false },
	embeds: { type: [Object], required: true, unique: false },
	stickTime: { type: String, required: true, unique: false },
	unstickTime: { type: String, required: true, unique: false }
});

export const StickyMessage = createModel<IStickyMessage>(
	"StickyMessage",
	schema
);
