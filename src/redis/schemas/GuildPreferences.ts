import { Schema, Repository, type RedisConnection } from "redis-om";
import { redis } from "..";

interface IGuildPreferences {
	guildId: string;
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
	guildId: { type: "string" },
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
	}

	// async getGuildPreferences(guildId: string) {
	// 	return (await this.fetch({ guildId })) as IGuildPreferences;
	// }
}

export const GuildPreferencesCache = new Repo(redis);
