import { GuildPreferences, type IGuildPreferences } from "@/mongo";
import {
	type Entity,
	type RedisConnection,
	Repository,
	Schema,
} from "redis-om";

export type ICachedGuildPreferences = IGuildPreferences & Entity;

const schema = new Schema("GuildPreferences", {
	guildId: { type: "string" },
	repEnabled: { type: "boolean" },
	repDisabledChannelIds: { type: "string[]" },
	hotmSessionOngoing: { type: "boolean" },
	modlogChannelId: { type: "string" },
	generalLogsChannelId: { type: "string" },
	actionRequiredChannelId: { type: "string" },
	welcomeChannelId: { type: "string" },
	confessionsChannelId: { type: "string" },
	confessionApprovalChannelId: { type: "string" },
	hostSessionApprovalChannelId: { type: "string" },
	countingChannelId: { type: "string" },
	hotmResultsChannelId: { type: "string" },
	hotmResultsEmbedId: { type: "string" },
	hostSessionChannelId: { type: "string" },
	archiveSessionCategoryId: { type: "string" },
	modmailCreateChannelId: { type: "string" },
	modmailThreadsChannelId: { type: "string" },
	modmailLogsChannelId: { type: "string" },
	closedDmChannelId: { type: "string" },
	banAppealFormLink: { type: "string" },
	forcedMuteRoleId: { type: "string" },
	welcomeChannelMessage: { type: "string" },
	welcomeDMMessage: { type: "string" },
	groupStudyChannelId: { type: "string" },
	keywordRequestsChannelId: { type: "string" },
});

export class GuildPreferencesRepository extends Repository {
	constructor(clientOrConnection: RedisConnection) {
		super(schema, clientOrConnection);
	}

	async get(guildId: string) {
		const cachedRes = (await this.fetch(guildId)) as IGuildPreferences;

		if (cachedRes.guildId) return cachedRes;

		const res = await GuildPreferences.findOne({ guildId });

		if (!res) return null;

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { _id, ...data } = res.toObject();

		await this.set(guildId, data);

		return data as IGuildPreferences;
	}

	async set(guildId: string, preferences: IGuildPreferences) {
		const res = (await this.save(
			guildId,
			preferences,
		)) as IGuildPreferences;

		await this.expire(guildId, 120);

		return res;
	}
}
