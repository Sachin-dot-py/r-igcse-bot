import {
	Schema,
	Repository,
	type RedisConnection,
	type Entity,
} from "redis-om";
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
	behaviorlogChannelId: { type: "string" },
	warnlogChannelId: { type: "string" },
	modmailChannelId: { type: "string" },
	actionRequiredChannelId: { type: "string" },
	modFeedbackChannelId: { type: "string" },
	confessionsChannelId: { type: "string" },
	confessionApprovalChannelId: { type: "string" },
	countingChannelId: { type: "string" },
	hotmResultsChannelId: { type: "string" },
	studySessionChannelId: { type: "string" },
	chatmodApplicationsChannelId: { type: "string" },
	colorRolesRoleId: { type: "string" },
	emoji: { type: "string", path: "$.colorRoles[*]" },
	label: { type: "string", path: "$.colorRoles[*]" },
	id: { type: "string", path: "$.colorRoles[*]" },
});

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
