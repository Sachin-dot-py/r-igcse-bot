import { Schema, model as createModel } from "mongoose";

export interface IGuildPreferences {
	guildId: string;

	repEnabled: boolean;
	repDisabledChannelIds: string[];

	modlogChannelId: string;
	behaviorlogChannelId: string;
	warnlogChannelId: string;
	botlogChannelId: string;
	botNewsChannelId: string;
	actionRequiredChannelId: string;

	welcomeChannelId: string;
	confessionsChannelId: string;
	confessionApprovalChannelId: string;
	countingChannelId: string;
	hotmResultsChannelId: string;
	studySessionChannelId: string;

	modmailChannelId: string;
	dmThreadsChannelId: string;

	helperRoles: {
		roleId: string;
		channelId: string;
	}[];

	banAppealFormLink: string;

	keywords: {
		keyword: string;
		response: string;
	}[];

	colorRoles: {
		requirementRoldId: string;
		emoji: string;
		label: string;
		roleId: string;
	}[];
}

const schema = new Schema<IGuildPreferences>({
	guildId: { type: String, required: true, unique: true },
	repEnabled: { type: Boolean, default: false },
	repDisabledChannelIds: { type: [String], default: [] },
	modlogChannelId: { type: String, default: null },
	behaviorlogChannelId: { type: String, default: null },
	warnlogChannelId: { type: String, default: null },
	botlogChannelId: { type: String, default: null },
	botNewsChannelId: { type: String, default: null },
	actionRequiredChannelId: { type: String, default: null },
	welcomeChannelId: { type: String, default: null },
	confessionsChannelId: { type: String, default: null },
	confessionApprovalChannelId: { type: String, default: null },
	countingChannelId: { type: String, default: null },
	hotmResultsChannelId: { type: String, default: null },
	studySessionChannelId: { type: String, default: null },
	modmailChannelId: { type: String, default: null },
	dmThreadsChannelId: { type: String, default: null },
	banAppealFormLink: { type: String, default: null },
	keywords: { type: [{ keyword: String, response: String }], default: [] },
	colorRoles: {
		type: [
			{
				requirementRoleId: String,
				emoji: String,
				label: String,
				id: String,
			},
		],
		default: [],
	},
	helperRoles: {
		type: [
			{
				roleId: String,
				channelId: String,
			},
		],
		default: [],
	},
});

export const GuildPreferences = createModel<IGuildPreferences>(
	"GuildPreferences",
	schema,
);
