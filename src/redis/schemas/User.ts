import { Schema, client } from "nekdis";

const schema = new Schema({
	userId: { type: "string" },
	playing: { type: "boolean" },
	subject: { type: "string" },
	sessionId: { type: "string" },
});

export const User = client.model("User", schema);
