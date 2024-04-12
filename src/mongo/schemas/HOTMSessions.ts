import { Schema, model as createModel } from "mongoose";

export interface IHOTMSessions {
    guildId: string;
    startDate: number;
    endDate: number;
}

const schema = new Schema<IHOTMSessions>({
    guildId: { type: String, required: true },
    startDate: { type: Number, required: true, unique: false },
    endDate: { type: Number, required: true, unique: false }
});

export const HOTMSessions = createModel<IHOTMSessions>("HOTMSessions", schema);
