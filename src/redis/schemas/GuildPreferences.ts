import {
	Schema,
	Repository,
	type RedisConnection,
	type Entity,
} from "redis-om";
import { redis } from "..";

interface IGuildPreferences extends Entity {
	modlogChannelId: string;
	botlogChannelId: string;
	welcomeChannelId: string;
	repEnabled: boolean;
	repDisabledChannelIds: string[];
	igHelperRoleId: string;
	alHelperRoleId: string;
	adminRoleId: string;
	moderatorRoleId: string;
	chatModRoleId: string;
	banAppealFormLink: string;
}

const schema = new Schema("GuildPreferences", {
	modlogChannelId: { type: "string" },
	botlogChannelId: { type: "string" },
	welcomeChannelId: { type: "string" },
	repEnabled: { type: "boolean" },
	repDisabledChannelIds: { type: "string[]" },
	igHelperRoleId: { type: "string" },
	alHelperRoleId: { type: "string" },
	adminRoleId: { type: "string" },
	moderatorRoleId: { type: "string" },
	chatModRoleId: { type: "string" },
	banAppealFormLink: { type: "string" },
});

class Repo extends Repository {
	constructor(clientOrConnection: RedisConnection) {
		super(schema, clientOrConnection);
		this.createIndex();
	}

	async get(guildId: string) {
		return (await this.fetch(guildId)) as IGuildPreferences;
	}

	async set(guildId: string, preferences: IGuildPreferences) {
		return (await this.save(guildId, preferences)) as IGuildPreferences;
	}
}

export const GuildPreferencesCache = new Repo(redis);
