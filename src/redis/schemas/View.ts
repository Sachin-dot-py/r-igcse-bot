import { client } from "@/index";
import { Schema, Repository } from "redis-om";

const schema = new Schema("View", {
	viewId: { type: "string" },
	messageId: { type: "string" },
});

export const View = new Repository(schema, client.redis);