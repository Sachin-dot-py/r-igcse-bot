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
});

export const GuildPreferences = createModel<IGuildPreferences>(
	"GuildPreferences",
	schema,
);

export const lookUpGuildPreference = <
	K extends keyof IGuildPreferences,
	V extends IGuildPreferences[K],
>(
	searchKey: K,
	searchValue: V,
	returnKey: keyof IGuildPreferences,
) => {
	return GuildPreferences.findOne({ [searchKey]: searchValue })?.then(
		(document) => document?.[returnKey] as V | undefined,
	);
};
