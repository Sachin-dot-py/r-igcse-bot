import type { MessageCreateOptions } from "discord.js";
import { Schema, model as createModel } from "mongoose";

export interface IScheduledMessage {
	guildId: string;
	channelId: string;
	message: MessageCreateOptions;
	scheduleTime: string;
}

const schema = new Schema<IScheduledMessage>({
	guildId: { type: String, required: true, unique: false },
	channelId: { type: String, required: true, unique: false },
	message: { type: Object, required: true, unique: false },
	scheduleTime: { type: String, required: true, unique: false },
});

export const ScheduledMessage = createModel<IScheduledMessage>(
	"ScheduledMessage",
	schema,
);
