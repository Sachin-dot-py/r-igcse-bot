import { Schema, client } from "nekdis";

const schema = new Schema({
	id: { type: "string" },
	channelId: { type: "string" },
	messageId: { type: "string" },
	content: { type: "string" },
	enabled: { type: "boolean" },
});

export const StickyMessageR = client.model("StickyMessage", schema);
