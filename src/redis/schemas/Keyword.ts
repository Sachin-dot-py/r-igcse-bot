import type { IKeyword } from "@/mongo/schemas/Keyword";
import {
	type Entity,
	type RedisConnection,
	Repository,
	Schema,
} from "redis-om";

export type ICachedKeyword = IKeyword & Entity;

const schema = new Schema("Keyword", {
	guildId: { type: "string" },
	keyword: { type: "string" },
	response: { type: "string" },
});

export class KeywordRepository extends Repository {
	constructor(clientOrConnection: RedisConnection) {
		super(schema, clientOrConnection);
	}

	async get(guildId: string, keyword: string) {
		return (
			(await this.fetch(`${keyword}-${guildId}`)) as { response: string }
		).response;
	}

	async delete(guildId: string, keyword: string) {
		await this.remove(`${keyword}-${guildId}`);
	}

	async append(keyword: ICachedKeyword) {
		await this.save(`${keyword.keyword}-${keyword.guildId}`, keyword);
	}
	
	async autoComplete(guildId: string, phrase: string) {
		// redisearch wildcard full-text search is very inconsitent so filtering instead
		phrase = phrase.trim().toLowerCase();

		const keywords = (await this.search().where('guildId').equal(guildId).return.all())
		.map(entry => entry.keyword as string);

		return (phrase ? keywords
		.filter(keyword => keyword.toLowerCase().includes(phrase))
		: keywords)
		.toSorted();
	}
}
