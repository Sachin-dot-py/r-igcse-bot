import { Client, Collection, type ClientOptions } from 'discord.js';
import type BaseCommand from './Structure/BaseCommand';
import Logger from '@/utils/Logger';

export class DiscordClient extends Client {
    private _commands = new Collection<string, BaseCommand>();
    private _logger: Logger;

    constructor(options: ClientOptions) {
        super(options);
        this._logger = new Logger(this);
    }

    get commands() {
        return this._commands;
    }

    get logger() {
        return this._logger;
    }
}
