import { Schema, model as createModel } from "mongoose";

export interface IGuildPreferences {
	guildId: string;

	repEnabled: boolean;
	repDisabledChannelIds: string[];

	modlogChannelId: string;
	botlogChannelId: string;
	welcomeChannelId: string;

	igHelperRoleId: string;
	alHelperRoleId: string;

	adminRoleId: string;
	moderatorRoleId: string;
	chatModRoleId: string;

	banAppealFormLink: string;

	keywords: {
		keyword: string;
		response: string;
	}[];
}

const schema = new Schema<IGuildPreferences>({
	guildId: { type: String, required: true, unique: true },
	modlogChannelId: { type: String, required: true },
	botlogChannelId: { type: String, required: true },
	welcomeChannelId: { type: String, required: true },
	repEnabled: { type: Boolean, required: true },
	repDisabledChannelIds: { type: [String], required: true },
	igHelperRoleId: { type: String, required: true },
	alHelperRoleId: { type: String, required: true },
	adminRoleId: { type: String, required: true },
	moderatorRoleId: { type: String, required: true },
	chatModRoleId: { type: String, required: true },
	banAppealFormLink: { type: String, required: true },
	keywords: {
		keyword: {
			type: String,
			required: true,
			unique: true,
		},
		response: {
			type: String,
			required: true,
			unique: false,
		},
	},
});

export const GuildPreferences = createModel<IGuildPreferences>(
	"GuildPreferences",
	schema,
);
