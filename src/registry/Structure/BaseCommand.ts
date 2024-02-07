import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export default abstract class BaseCommand {
    constructor(private _data: SlashCommandBuilder) {}

    get data() {
        return this._data;
    }

    abstract execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
