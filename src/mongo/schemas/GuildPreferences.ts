import { Schema, model as createModel } from "mongoose";

export interface IGuildPreferences {
	guildId: string;
	modlogChannel: string;
	repEnabled: boolean;
	suggestionsChannel: string;
	warnlogChannel: string;
	emoteChannel: string;
	repDisabledChannels: string[];
	helperRoleIds: string[];
}

const schema = new Schema<IGuildPreferences>({
	guildId: { type: String, required: true, unique: true },
	modlogChannel: { type: String, required: true },
	repEnabled: { type: Boolean, required: true },
	suggestionsChannel: { type: String, required: true },
	warnlogChannel: { type: String, required: true },
	emoteChannel: { type: String, required: true },
	repDisabledChannels: { type: [String], required: true },
	helperRoleIds: { type: [String], required: true },
});

export const GuildPreferences = createModel<IGuildPreferences>(
	"GuildPreferences",
	schema,
);
