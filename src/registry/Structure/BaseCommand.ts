import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    type CacheType,
    type SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import type { DiscordClient } from '../client';

export type DiscordChatInputCommandInteraction = Omit<
    ChatInputCommandInteraction,
    'client'
>;

export default abstract class BaseCommand {
    private _category: string = '';

    constructor(
        private _data:
            | Omit<SlashCommandBuilder, 'addSubcommandGroup' | 'addSubcommand'>
            | SlashCommandSubcommandsOnlyBuilder,
    ) {}

    set category(category: string) {
        this._category = category;
    }

    get category() {
        return this._category;
    }

    get data() {
        return this._data;
    }

    abstract execute(
        interaction: DiscordChatInputCommandInteraction,
        client: DiscordClient,
    ): Promise<void>;
}
