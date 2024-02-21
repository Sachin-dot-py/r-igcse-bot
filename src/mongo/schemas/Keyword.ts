import { Schema, model as createModel } from 'mongoose';

export interface IKeyword {
    keyword: string;
    autoreply: boolean;
    guildId: string;
}

const schema = new Schema<IKeyword>({
    keyword: {
        type: String,
        required: true,
        unique: true,
    },
    autoreply: {
        type: Boolean,
        required: true,
        unique: false,
    },
    guildId: {
        type: String,
        required: true,
        unique: false,
    },
});

export const Keyword = createModel<IKeyword>('Keyword', schema);
