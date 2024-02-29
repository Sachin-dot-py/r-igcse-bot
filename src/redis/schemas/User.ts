import { Schema, Repository } from "redis-om";
import { redis } from "..";

const schema = new Schema("User", {
	userId: { type: "string" },
	playing: { type: "boolean" },
	subject: { type: "string" },
	sessionId: { type: "string" },
});

export const PracticeUserCache = new Repository(schema, redis);
