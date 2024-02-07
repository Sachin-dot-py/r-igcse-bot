import { Client, Collection, type ClientOptions } from 'discord.js';
import type BaseCommand from './Structure/BaseCommand.ts';

export class DiscordClient extends Client {
    private _commands = new Collection<string, BaseCommand>();

    constructor(options: ClientOptions) {
        super(options);
    }

    get commands() {
        return this._commands;
    }
}
