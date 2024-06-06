import { Schema, model as createModel } from "mongoose";

export interface IChannelLockdown {
	channelId: string;
	startTimestamp: string;
	endTimestamp: string;
}

const schema = new Schema<IChannelLockdown>({
	channelId: { type: String, required: true, unique: true },
	startTimestamp: { type: String, required: true, unique: false },
	endTimestamp: { type: String, required: true, unique: false },
});

export const ChannelLockdown = createModel<IChannelLockdown>(
	"ChannelLockdown",
	schema,
);
