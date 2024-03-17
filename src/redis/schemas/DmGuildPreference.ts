import type { IDmGuildPreference } from "@/mongo/schemas/DmGuildPreference";
import {
	Repository,
	Schema,
	type Entity,
	type RedisConnection,
} from "redis-om";

export type ICachedDmGuildPreference = IDmGuildPreference & Entity;

const schema = new Schema("DmGuildPreference", {
	userId: { type: "string" },
	guildId: { type: "string" },
});

export class DmGuildPreferenceRepository extends Repository {
	constructor(clientOrConnection: RedisConnection) {
		super(schema, clientOrConnection);
	}

	async get(userId: string) {
		const preferences = (await this.fetch(userId)) as ICachedDmGuildPreference;
		if (!preferences.userId) {
			return null;
		}
		return preferences;
	}

	async set(userId: string, guildId: string) {
		const res = (await this.save(userId, {
			guildId,
		})) as ICachedDmGuildPreference;

		this.expire(userId, 120);

		return res;
	}
}
