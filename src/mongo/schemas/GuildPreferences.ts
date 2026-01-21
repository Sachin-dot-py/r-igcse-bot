import { Schema, model as createModel } from "mongoose";

export type IGuildPreferences = {
	guildId: string;

	repEnabled: boolean;
	repDisabledChannelIds: string[];
} & Partial<{
	hotmSessionOngoing: boolean;
	modlogChannelId: string;
	generalLogsChannelId: string;
	actionRequiredChannelId: string;

	welcomeChannelId: string;
	confessionsChannelId: string;
	confessionApprovalChannelId: string;
	hostSessionApprovalChannelId: string;
	countingChannelId: string;
	qotwChannelId: string;
	qotwRoleId: string;
	hotmResultsChannelId: string;
	hotmResultsEmbedId: string;
	hostSessionChannelId: string;
	archiveSessionCategoryId: string;

	modmailCreateChannelId: string;
	modmailThreadsChannelId: string;
	modmailLogsChannelId: string;
	closedDmChannelId: string;

	banAppealFormLink: string;

	moderatorRoleId: string;
	forcedMuteRoleId: string;
	welcomeChannelMessage: string;
	welcomeDMMessage: string;

	groupStudyChannelId: string;
	keywordRequestChannelId: string;
	tagResourceApprovalChannelId: string;
	offTopicAlertCategoryIds: string[];
	alertsChannelId: string;
}>;

const schema = new Schema<IGuildPreferences>({
	guildId: { type: String, required: true, unique: true },
	repEnabled: { type: Boolean, default: false },
	repDisabledChannelIds: { type: [String], default: [] },
	hotmSessionOngoing: { type: Boolean, default: false },
	modlogChannelId: { type: String, default: null },
	generalLogsChannelId: { type: String, default: null },
	actionRequiredChannelId: { type: String, default: null },
	welcomeChannelId: { type: String, default: null },
	confessionsChannelId: { type: String, default: null },
	confessionApprovalChannelId: { type: String, default: null },
	hostSessionApprovalChannelId: { type: String, default: null },
	countingChannelId: { type: String, default: null },
	qotwChannelId: { type: String, default: null },
	qotwRoleId: { type: String, default: null },
	hotmResultsChannelId: { type: String, default: null },
	hotmResultsEmbedId: { type: String, default: null },
	hostSessionChannelId: { type: String, default: null },
	archiveSessionCategoryId: { type: String, default: null },
	modmailCreateChannelId: { type: String, default: null },
	modmailThreadsChannelId: { type: String, default: null },
	modmailLogsChannelId: { type: String, default: null },
	closedDmChannelId: { type: String, default: null },
	banAppealFormLink: { type: String, default: null },
	moderatorRoleId: { type: String, default: null },
	forcedMuteRoleId: { type: String, default: null },
	welcomeChannelMessage: { type: String, default: null },
	welcomeDMMessage: { type: String, default: null },
	groupStudyChannelId: { type: String, default: null },
	keywordRequestChannelId: { type: String, default: null },
	tagResourceApprovalChannelId: { type: String, default: null },
	offTopicAlertCategoryIds: { type: [String], default: [] },
	alertsChannelId: { type: String, default: null },
});

export const GuildPreferences = createModel<IGuildPreferences>(
	"GuildPreferences",
	schema,
);
