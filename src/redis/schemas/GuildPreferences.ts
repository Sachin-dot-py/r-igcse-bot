import {
	Schema,
	Repository,
	type RedisConnection,
	type Entity,
} from "redis-om";
import type { IGuildPreferences } from "@/mongo";

type ICachedGuildPreferences = Omit<IGuildPreferences, "guildId"> & Entity;

const schema = new Schema("GuildPreferences", {});

export class GuildPreferencesRepository extends Repository {
	constructor(clientOrConnection: RedisConnection) {
		super(schema, clientOrConnection);
		this.createIndex();
	}

	async get(guildId: string) {
		return (await this.fetch(guildId)) as ICachedGuildPreferences;
	}

	async set(guildId: string, preferences: ICachedGuildPreferences) {
		return (await this.save(guildId, preferences)) as ICachedGuildPreferences;
	}
}
