import { Schema, model as createModel } from "mongoose";

export interface IGuildPreferences {
	guildId: string;

	repEnabled: boolean;
	repDisabledChannelIds: string[];

	modlogChannelId: string;
	botlogChannelId: string;
	warnlogChannelId: string;

	suggestionsChannelId: string;
	emoteChannelId: string;

	igHelperRoleId: string;
	alHelperRoleId: string;

	moderatorRoleId: string;
	tempModRoleId: string;
	chatModRoleId: string;

	banAppealFormLink: string;
}

const schema = new Schema<IGuildPreferences>({
	guildId: { type: String, required: true, unique: true },
	modlogChannelId: { type: String, required: true },
	botlogChannelId: { type: String, required: true },
	repEnabled: { type: Boolean, required: true },
	suggestionsChannelId: { type: String, required: true },
	warnlogChannelId: { type: String, required: true },
	emoteChannelId: { type: String, required: true },
	repDisabledChannelIds: { type: [String], required: true },
	igHelperRoleId: { type: String, required: true },
	alHelperRoleId: { type: String, required: true },
	moderatorRoleId: { type: String, required: true },
	tempModRoleId: { type: String, required: true },
	chatModRoleId: { type: String, required: true },
	banAppealFormLink: { type: String, required: true },
});

export const GuildPreferences = createModel<IGuildPreferences>(
	"GuildPreferences",
	schema,
);
