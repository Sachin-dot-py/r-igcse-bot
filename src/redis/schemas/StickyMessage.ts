import {
	Repository,
	Schema,
	type Entity,
	type RedisConnection,
} from "redis-om";
import { redis } from "..";

interface ICachedStickyMessage extends Entity {
	channelId: string;
	messageId: string;
	embed: string;
	stickTime: string;
	unstickTime: string;
	enabled: boolean;
}

const schema = new Schema("StickyMessage", {
	channelId: { type: "string" },
	messageId: { type: "string" },
	embed: { type: "string" },
	stickTime: { type: "string" },
	unstickTime: { type: "string" },
	enabled: { type: "boolean" },
});

class StickyMessageRepository extends Repository {
	constructor(clientOrConnection: RedisConnection) {
		super(schema, clientOrConnection);
		this.createIndex();
	}

	async get(sessionId: string) {
		return (await this.fetch(sessionId)) as ICachedStickyMessage;
	}

	async set(messageId: string, stickyMessageData: ICachedStickyMessage) {
		return (await this.save(
			messageId,
			stickyMessageData,
		)) as ICachedStickyMessage;
	}
}

export const StickyMessageCache = new StickyMessageRepository(redis);
