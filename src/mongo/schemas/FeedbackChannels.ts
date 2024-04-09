import { Schema, model as createModel } from "mongoose";

export interface IFeedbackChannels {
    guildId: string;
    label: string;
    channelId: string;
}

const schema = new Schema<IFeedbackChannels>({
    guildId: { type: String, required: true, unique: false },
    label: { type: String, required: true, unique: false },
    channelId: { type: String, required: true, unique: false }
});

schema.index({ guildId: 1, label: 1 }, { unique: true });

export const FeedbackChannels = createModel<IFeedbackChannels>("FeedbackChannels", schema);