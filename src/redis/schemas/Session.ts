import { Schema, client } from "nekdis";

const schema = new Schema({
	sessionId: { type: "string" },
	channelId: { type: "string" },
	threadId: { type: "string" },
	subject: { type: "string" },
	topics: { type: "array" },
	limit: { type: "number" },
	minimumYear: { type: "number" },
	users: { type: "array" },
	owner: { type: "string" },
	private: { type: "boolean" },
	paused: { type: "boolean" },
	currentlySolving: { type: "string" },
	expireTime: { type: "date" },
});

export const Session = client.model("Session", schema);
