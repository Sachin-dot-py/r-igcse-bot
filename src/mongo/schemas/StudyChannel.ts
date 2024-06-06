import { Schema, model as createModel } from "mongoose";

export interface IStudyChannel {
	guildId: string;
	channelId: string;
	helperRoleId: string;
	studyPingRoleId: string;
}

const schema = new Schema<IStudyChannel>({
	guildId: { type: String, required: true, unique: false },
	channelId: { type: String, required: true, unique: true },
	helperRoleId: { type: String, required: true, unique: false },
	studyPingRoleId: { type: String, required: true, unique: true },
});

export const StudyChannel = createModel<IStudyChannel>("StudyChannel", schema);
