import { Schema, model as createModel } from 'mongoose';

export interface IPrivateDmThread {
    _id: number;
    threadId: string;
}

const schema = new Schema<IPrivateDmThread>({
    _id: { type: Number, required: true },
    threadId: { type: String, required: true },
});

export const PrivateDmThread = createModel<IPrivateDmThread>(
    'PrivateDmThread',
    schema,
);
