import { Schema, model as createModel } from "mongoose";

export interface IGuildPreferences {
	guildId: string;

	repEnabled: boolean;
	repDisabledChannelIds: string[];

	modlogChannelId: string;
	behaviorlogChannelId: string;
	warnlogChannelId: string;
	botlogChannelId: string;
	actionRequiredChannelId: string;

	welcomeChannelId: string;
	modFeedbackChannelId: string;
	confessionsChannelId: string;
	confessionApprovalChannelId: string;
	countingChannelId: string;
	hotmResultsChannelId: string;
	studySessionChannelId: string;

	modmailChannelId: string;

	// igHelperRoles: {
	// 	roleId: string;
	// 	channelId: string;
	// }[];
	// alHelperRoles: {
	// 	roleId: string;
	// 	channelId: string;
	// }[];

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

	colorRolesRoleId: string;

	colorRoles: {
		emoji: string;
		label: string;
		id: string;
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
	actionRequiredChannelId: { type: String, default: null },
	welcomeChannelId: { type: String, default: null },
	modFeedbackChannelId: { type: String, default: null },
	confessionsChannelId: { type: String, default: null },
	confessionApprovalChannelId: { type: String, default: null },
	countingChannelId: { type: String, default: null },
	hotmResultsChannelId: { type: String, default: null },
	studySessionChannelId: { type: String, default: null },
	modmailChannelId: { type: String, default: null },
	igHelperRoleId: { type: String, default: null },
	alHelperRoleId: { type: String, default: null },
	adminRoleId: { type: String, default: null },
	moderatorRoleId: { type: String, default: null },
	chatModRoleId: { type: String, default: null },
	banAppealFormLink: { type: String, default: null },
	keywords: { type: [{ keyword: String, response: String }], default: [] },
	colorRolesRoleId: { type: String, default: null },
	colorRoles: {
		type: [
			{
				emoji: String,
				label: String,
				id: String,
			},
		],
		default: [],
	},
});

export const GuildPreferences = createModel<IGuildPreferences>(
	"GuildPreferences",
	schema,
);
