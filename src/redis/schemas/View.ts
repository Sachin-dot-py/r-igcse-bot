import { Schema, client } from "nekdis";

const schema = new Schema({
	viewId: { type: "string" },
	messageId: { type: "string" },
});

export const View = client.model("View", schema);
