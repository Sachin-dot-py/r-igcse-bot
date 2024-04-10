import { Schema, model as createModel } from "mongoose";

export interface IFeedbackChannel {
	guildId: string;
	label: string;
	channelId: string;
}

const schema = new Schema<IFeedbackChannel>({
	guildId: { type: String, required: true, unique: false },
	label: { type: String, required: true, unique: false },
	channelId: { type: String, required: true, unique: false }
});

export const FeedbackChannels = createModel<IFeedbackChannel>(
	"FeedbackChannel",
	schema
);
