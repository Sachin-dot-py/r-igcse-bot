import type { RedisClientType } from "redis";
import { Schema, type Entity, Repository } from "redis-om";

export interface IStickyMessage extends Entity {
	id: string;
	channelId: string;
	messageId: string;
	embedTitles: string[];
	enabled: boolean;
}

export const StickyMessage = new Schema(
	"StickyMessage",
	{
		id: { type: "string" },
		channelId: { type: "string" },
		messageId: { type: "string" },
		embedTitles: { type: "string[]", path: "$.embeds[*].title" },
		enabled: { type: "boolean" },
	},
	{
		dataStructure: "JSON",
	},
);

export class StickyMessageRepo extends Repository {
	constructor(redis: RedisClientType) {
		super(StickyMessage, redis);
		this.createIndex();
	}

	async get(id: string): Promise<IStickyMessage | null> {
		return (await this.fetch(id)) as IStickyMessage;
	}

	async set(id: string, data: IStickyMessage): Promise<void> {
		await this.save(id, data);
	}

	async delete(id: string): Promise<void> {
		await this.remove(id);
	}

	async getAll(): Promise<IStickyMessage[]> {
		return (await this.search().return.all()) as IStickyMessage[];
	}
}
