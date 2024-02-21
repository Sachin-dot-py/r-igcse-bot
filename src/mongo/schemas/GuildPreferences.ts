import { Schema, model as createModel } from 'mongoose';

export interface IGuildPreferences {
    guildId: number;
    modlogChannel: number;
    repEnabled: boolean;
    suggestionsChannel: number;
    warnlogChannel: number;
    emoteChannel: number;
}

const schema = new Schema<IGuildPreferences>({
    guildId: { type: Number, required: true, unique: true },
    modlogChannel: { type: Number, required: true },
    repEnabled: { type: Boolean, required: true },
    suggestionsChannel: { type: Number, required: true },
    warnlogChannel: { type: Number, required: true },
    emoteChannel: { type: Number, required: true },
});

export const PrivateDmThread = createModel<IGuildPreferences>(
    'PrivateDmThread',
    schema,
);
