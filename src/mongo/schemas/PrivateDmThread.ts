import { Schema, model as createModel } from 'mongoose';

export interface IPrivateDmThread {
    userId: number;
    threadId: string;
}

const schema = new Schema<IPrivateDmThread>({
    userId: { type: Number, required: true },
    threadId: { type: String, required: true },
});

export const PrivateDmThread = createModel<IPrivateDmThread>(
    'PrivateDmThread',
    schema,
);
