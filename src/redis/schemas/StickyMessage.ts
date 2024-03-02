import type { IStickyMessage } from "@/mongo";
import {
	Repository,
	Schema,
	type Entity,
	type RedisConnection,
} from "redis-om";

export type ICachedStickyMessage = IStickyMessage & Entity;

const schema = new Schema("StickyMessage", {
	channelId: { type: "string" },
	messageId: { type: "string" },
	embeds: { type: "string[]" },
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
		res.embeds = (res.embeds as string[]).map((embed) => JSON.parse(embed));

		return res as ICachedStickyMessage;
	}

	async set(id: string, stickyMessageData: IStickyMessage) {
		const data = {
			...stickyMessageData,
			embeds: stickyMessageData.embeds.map((embed) => JSON.stringify(embed)),
		};

		await this.save(id, data);

		return stickyMessageData;
	}
}
