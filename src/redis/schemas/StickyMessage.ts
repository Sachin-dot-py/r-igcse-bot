import type { APIEmbed, MessageCreateOptions } from "discord.js";
import {
	Repository,
	Schema,
	type Entity,
	type RedisConnection
} from "redis-om";

export type APIEmbedRedis = {
	title?: string;
	type?: string;
	description?: string;
	url?: string;
	timestamp?: string;
	color?: number;
	footer?: {
		text: string;
		icon_url?: string;
		proxy_icon_url?: string;
	};
	image?: {
		url: string;
		proxy_url?: string;
		height?: number;
		width?: number;
	};
	thumbnail?: {
		url: string;
		proxy_url?: string;
		height?: number;
		width?: number;
	};
	video?: {
		url?: string;
		proxy_url?: string;
		height?: number;
		width?: number;
	};
	provider?: {
		name?: string;
		url?: string;
	};
	author?: {
		name: string;
		url?: string;
		icon_url?: string;
		proxy_icon_url?: string;
	};
	fields?: {
		name: string;
		value: string;
		inline?: boolean;
	}[];
};

export type MessageCreateOptionsRedis = {
	content?: string;
	embeds?: APIEmbedRedis[];
};

export interface ICachedStickyMessage extends Entity {
	channelId: string;
	messageId: string | null;
	message: MessageCreateOptionsRedis;
}

const schema = new Schema("StickyMessage", {
	channelId: { type: "string" },
	messageId: { type: "string" },
	content: { type: "string", path: "$.message.content" },
	titles: { type: "string[]", path: "$.message.embeds[*].title" }
});

export class StickyMessageRepository extends Repository {
	constructor(clientOrConnection: RedisConnection) {
		super(schema, clientOrConnection);
	}

	async get(id: string) {
		const res = await this.fetch(id);
		if (!res.channelId) {
			return null;
		}

		return res;
	}

	async set(id: string, stickyMessageData: ICachedStickyMessage) {
		await this.save(id, stickyMessageData);
	}

	async getAll(): Promise<ICachedStickyMessage[]> {
		return (await this.search().return.all()) as ICachedStickyMessage[];
	}
}
