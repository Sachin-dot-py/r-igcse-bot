import { Schema, model as createModel } from "mongoose";

export interface IStickyPinnedMessage {
	channelId: string;
	messageId: string;
}

const schema = new Schema<IStickyPinnedMessage>({
	channelId: { type: String, required: true, unique: true },
	messageId: { type: String, required: true, unique: true },
});

export const StickyPinnedMessage = createModel<IStickyPinnedMessage>(
	"StickyPinnedMessage",
	schema,
);
