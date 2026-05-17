import { Schema, model as createModel } from "mongoose";

export interface IReputationQueue {
    input: {
        author: string;
        content: string;
        attachmentUrls: string[];
    }[];
    reputationDataObjectId: string;
}

const schema = new Schema<IReputationQueue>({
    input: { type: [Object], required: true },
    reputationDataObjectId: { type: String, required: true },
});

export const ReputationQueue = createModel<IReputationQueue>("ReputationQueue", schema);
