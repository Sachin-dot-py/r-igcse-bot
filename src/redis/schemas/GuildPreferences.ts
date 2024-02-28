import { Schema, client } from "nekdis";

const schema = new Schema({
	modlogChannelId: { type: "string" },
	botlogChannelId: { type: "string" },
	welcomeChannelId: { type: "string" },
	repEnabled: { type: "boolean" },
	repDisabledChannelIds: { type: "array" },
	igHelperRoleId: { type: "string" },
	alHelperRoleId: { type: "string" },
	adminRoleId: { type: "string" },
	moderatorRoleId: { type: "string" },
	chatModRoleId: { type: "string" },
	banAppealFormLink: { type: "string" },
});

export const GuildPreferencesCache = client.model("Question", schema);
