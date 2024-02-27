import { Schema, client } from "nekdis";

const schema = new Schema({
	$id: { type: "string" },
	modlogChannelId: { type: "string" },
	botlogChannelId: { type: "string" },
	repEnabled: { type: "boolean" },
	suggestionsChannelId: { type: "string" },
	warnlogChannelId: { type: "string" },
	emoteChannelId: { type: "string" },
	repDisabledChannelIds: { type: "array" },
	igHelperRoleId: { type: "string" },
	alHelperRoleId: { type: "string" },
	moderatorRoleId: { type: "string" },
	tempModRoleId: { type: "string" },
	chatModRoleId: { type: "string" },
	banAppealFormLink: { type: "string" },
});

export const GuildPreferencesCache = client.model("Question", schema);
