import { Schema, model as createModel } from "mongoose";

export interface IChannelLockdown {
	guildId: string;
	channelId: string;
	startTimestamp: string;
	endTimestamp: string;
}

const schema = new Schema<IChannelLockdown>({
	guildId: { type: String, required: true, unique: false },
	channelId: { type: String, required: true, unique: true },
	startTimestamp: { type: String, required: true, unique: false },
	endTimestamp: { type: String, required: true, unique: false },
});

export const ChannelLockdown = createModel<IChannelLockdown>(
	"ChannelLockdown",
	schema,
);
