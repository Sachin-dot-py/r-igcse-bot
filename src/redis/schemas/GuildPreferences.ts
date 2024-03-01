import {
	Schema,
	Repository,
	type RedisConnection,
	type Entity,
} from "redis-om";
import { redis } from "..";
import type { IGuildPreferences } from "@/mongo";

type ICachedGuildPreferences = Omit<IGuildPreferences, "guildId"> & Entity;

const schema = new Schema("GuildPreferences", {
	modlogChannelId: { type: "string" },
	botlogChannelId: { type: "string" },
	welcomeChannelId: { type: "string" },
	repEnabled: { type: "boolean" },
	repDisabledChannelIds: { type: "string[]" },
	igHelperRoleId: { type: "string" },
	alHelperRoleId: { type: "string" },
	// igHelperRoles: {
	// 	roleId: string;
	// 	channelId: string;
	// }[];
	// alHelperRoles: {
	// 	roleId: string;
	// 	channelId: string;
	// }[];
	adminRoleId: { type: "string" },
	moderatorRoleId: { type: "string" },
	chatModRoleId: { type: "string" },
	banAppealFormLink: { type: "string" },
	keyword: { type: "string", path: "$.keywords[*]" },
	response: { type: "string", path: "$.keywords[*]" },
});

class GuildPreferencesRepository extends Repository {
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

export const GuildPreferencesCache = new GuildPreferencesRepository(redis);
