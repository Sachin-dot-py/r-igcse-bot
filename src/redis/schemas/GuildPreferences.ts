import { client } from "@/index";
import { Schema, Repository } from "redis-om";

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

export const GuildPreferencesCache = new Repository(schema, client.redis);
