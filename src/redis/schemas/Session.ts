import { Schema, Repository } from "redis-om";
import { redis } from "..";

const schema = new Schema("Session", {
	sessionId: { type: "string" },
	channelId: { type: "string" },
	threadId: { type: "string" },
	subject: { type: "string" },
	topics: { type: "string[]" },
	limit: { type: "number" },
	minimumYear: { type: "number" },
	users: { type: "string[]" },
	owner: { type: "string" },
	private: { type: "boolean" },
	paused: { type: "boolean" },
	currentlySolving: { type: "string" },
	expireTime: { type: "date" },
});

export const SessionCache = new Repository(schema, redis);
