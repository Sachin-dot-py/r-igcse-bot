import type { IDmGuildPreference } from "@/mongo/schemas/DmGuildPreference";
import {
	Repository,
	Schema,
	type Entity,
	type RedisConnection,
} from "redis-om";

export type ICachedDmGuildPreference = Omit<IDmGuildPreference, "userId"> &
	Entity;

const schema = new Schema("Question", {
	guildId: { type: "string" },
});

export class DmGuildPreferenceRepository extends Repository {
	constructor(clientOrConnection: RedisConnection) {
		super(schema, clientOrConnection);
		this.createIndex();
	}

	async get(userId: string) {
		return (await this.fetch(userId)) as ICachedDmGuildPreference;
	}

	async set(userId: string, guildId: string) {
		const res = (await this.save(userId, {
			guildId,
		})) as ICachedDmGuildPreference;

		this.expire(userId, 120);

		return res;
	}
}
