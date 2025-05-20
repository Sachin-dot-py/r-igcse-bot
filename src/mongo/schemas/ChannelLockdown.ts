import { Schema, model as createModel } from "mongoose";

export interface IChannelLockdown {
	lockID: string;
	guildId: string;
	channelId: string;
	startTimestamp: string;
	endTimestamp: string;
	locked: boolean;
}

const schema = new Schema<IChannelLockdown>({
	lockID: { type: String, required: true, unique: true },
	guildId: { type: String, required: true, unique: false },
	channelId: { type: String, required: true, unique: true },
	startTimestamp: { type: String, required: true, unique: false },
	endTimestamp: { type: String, required: true, unique: false },
	locked: { type: Boolean, required: true, unique: false },
});

export const ChannelLockdown = createModel<IChannelLockdown>(
	"ChannelLockdown",
	schema,
);
