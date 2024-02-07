import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    type SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

export default abstract class BaseCommand {
    constructor(
        private _data:
            | Omit<SlashCommandBuilder, 'addSubcommandGroup' | 'addSubcommand'>
            | SlashCommandSubcommandsOnlyBuilder,
    ) {}

    get data() {
        return this._data;
    }

    abstract execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
