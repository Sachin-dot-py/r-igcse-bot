import { Schema, model as createModel } from "mongoose";

export interface IHostingSession {
    guildId: string;
    teachers: string[]
    studyPingRoleId: string;
    startDate: number;
    endDate: number;
    accepted: boolean;
    scheduled?: boolean;
    messageId?: string;
    contents?: string[];
    channelId?: string;
    scheduledEventId?: string;
}

const schema = new Schema<IHostingSession>({
    guildId: { type: String, required: true, unique: false },
    teachers: { type: [String], required: true, unique: false },
    studyPingRoleId: { type: String, required: true, unique: false },
    startDate: { type: Number, required: true, unique: false },
    endDate: { type: Number, required: true, unique: false },
    accepted: { type: Boolean, required: false, default: false, unique: false },
    scheduled: { type: Boolean, required: false, default: false, unique: false },
    messageId: { type: String, required: false, default: null, unique: true },
    contents: { type: [String], required: false, default: null, unique: false },
    channelId: { type: String, required: false, default: null, unique: false },
    scheduledEventId: { type: String, required: false, default: null, unique: false }
});

export const HostSession = createModel<IHostingSession>(
    "HostSession",
    schema
);
