import { redis } from "../";
import { Schema, Repository } from "redis-om";

const schema = new Schema("View", {
	viewId: { type: "string" },
	messageId: { type: "string" },
});

export const PracticeViewCache = new Repository(schema, redis);
