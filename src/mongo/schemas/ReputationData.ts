import { Schema, model as createModel } from "mongoose";

export interface IReputationData {
    reppedUser: string;
    reppedBy?: string | null;
    repNumber: number;
    when: Date;
    channelId: string;
    guildId: string;
    deleted?: boolean | null;
}

const schema = new Schema<IReputationData>({
    reppedUser: { type: String, required: true },
    reppedBy: { type: String, required: false },
    repNumber: { type: Number, required: true },
    when: { type: Date, required: true },
    channelId: { type: String, required: true },
    guildId: { type: String, required: true },
    deleted: { type: Boolean, required: false },
});

export const ReputationData = createModel<IReputationData>(
    "ReputationData",
    schema
);
