import { Schema, model as createModel } from "mongoose";

export type IGuildPreferences = {
	guildId: string;

	repEnabled: boolean;
	repDisabledChannelIds: string[];
} & Partial<{
	modlogChannelId: string;
	behaviorlogChannelId: string;
	warnlogChannelId: string;
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
	closedDmChannelId: string;

	banAppealFormLink: string;

	forcedMuteRoleId: string;
}>;

const schema = new Schema<IGuildPreferences>({
	guildId: { type: String, required: true, unique: true },
	repEnabled: { type: Boolean, default: false },
	repDisabledChannelIds: { type: [String], default: [] },
	modlogChannelId: { type: String, default: null },
	behaviorlogChannelId: { type: String, default: null },
	warnlogChannelId: { type: String, default: null },
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
	closedDmChannelId: { type: String, default: null },
	banAppealFormLink: { type: String, default: null },
	forcedMuteRoleId: { type: String, default: null }
});

export const GuildPreferences = createModel<IGuildPreferences>(
	"GuildPreferences",
	schema
);
