import type { IStickyMessage } from "@/mongo";
import {
	Repository,
	Schema,
	type Entity,
	type RedisConnection,
} from "redis-om";

type ICachedStickyMessage = IStickyMessage & { enabled: boolean } & Entity;

const schema = new Schema("StickyMessage", {
	channelId: { type: "string" },
	messageId: { type: "string" },
	embed: { type: "string" },
	stickTime: { type: "string" },
	unstickTime: { type: "string" },
	enabled: { type: "boolean" },
});

export class StickyMessageRepository extends Repository {
	constructor(clientOrConnection: RedisConnection) {
		super(schema, clientOrConnection);
		this.createIndex();
	}

	async get(sessionId: string) {
		const res = await this.fetch(sessionId);
		res.embed = JSON.parse(res.embed as string);

		return res as ICachedStickyMessage;
	}

	async set(messageId: string, stickyMessageData: ICachedStickyMessage) {
		const data = {
			...stickyMessageData,
			embed: JSON.stringify(stickyMessageData.embed),
		};

		await this.save(messageId, data);

		return stickyMessageData;
	}
}
