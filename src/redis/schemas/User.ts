import { client } from "@/index";
import { Schema, Repository } from "redis-om";


const schema = new Schema("User", {
	userId: { type: "string" },
	playing: { type: "boolean" },
	subject: { type: "string" },
	sessionId: { type: "string" },
});

export const User = new Repository(schema, client.redis);

