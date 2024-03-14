import type { IDmGuildPreference } from "@/mongo/schemas/DmGuildPreference";
import {
	Schema,
	Repository,
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
		return (await this.save(userId, {
			guildId,
		})) as ICachedDmGuildPreference;
	}
}
