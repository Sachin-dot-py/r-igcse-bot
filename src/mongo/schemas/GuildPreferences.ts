import { Schema, model as createModel } from "mongoose";

export interface IGuildPreferences {
	guildId: string;
	repEnabled: boolean;
	repDisabledChannelIds: string[];
	modlogChannelId: string;
	suggestionsChannelId: string;
	warnlogChannelId: string;
	emoteChannelId: string;
	helperRoleIds: string[];
	banAppealFormLink: string;
}

const schema = new Schema<IGuildPreferences>({
	guildId: { type: String, required: true, unique: true },
	modlogChannelId: { type: String, required: true },
	repEnabled: { type: Boolean, required: true },
	suggestionsChannelId: { type: String, required: true },
	warnlogChannelId: { type: String, required: true },
	emoteChannelId: { type: String, required: true },
	repDisabledChannelIds: { type: [String], required: true },
	helperRoleIds: { type: [String], required: true },
	banAppealFormLink: { type: String, required: true },
});

export const GuildPreferences = createModel<IGuildPreferences>(
	"GuildPreferences",
	schema,
);
