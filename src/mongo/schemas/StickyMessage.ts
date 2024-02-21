import { Schema, model as createModel } from 'mongoose';

export interface IStickyMessage {
    channelId: string;
    messageId: string;
    // content: {};
    enabled: boolean;
}

const schema = new Schema<IStickyMessage>({
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    enabled: { type: Boolean, required: true },
});

export const StickyMessage = createModel<IStickyMessage>(
    'StickyMessage',
    schema,
);
