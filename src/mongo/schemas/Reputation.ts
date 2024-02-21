import { Schema, model as createModel } from 'mongoose';

export interface IReputation {
    userId: number;
    rep: number;
    guildId: number;
}

const schema = new Schema<IReputation>({
    userId: { type: Number, required: true },
    rep: { type: Number, required: true },
    guildId: { type: Number, required: true },
});

export const Reputation = createModel<IReputation>('Reputation', schema);
