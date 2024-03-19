import type { IKeyword } from "@/mongo/schemas/Keyword";
import {
	Repository,
	Schema,
	type Entity,
	type RedisConnection
} from "redis-om";

export type ICachedKeyword = IKeyword & Entity;

const schema = new Schema("Keyword", {
	guildId: { type: "string" },
	keyword: { type: "string" },
	response: { type: "string" }
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

	async append(keyword: ICachedKeyword) {
		await this.save(`${keyword.keyword}-${keyword.guildId}`, {
			response: keyword.response
		});

		return;
	}
}
