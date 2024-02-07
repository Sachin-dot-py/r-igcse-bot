import type { Events } from 'discord.js';
import type { DiscordClient } from '../client.ts';

export default abstract class BaseEvent {
    constructor(private _name: Events) {}

    get name() {
        return this._name;
    }

    abstract execute(client: DiscordClient, ...args: any): void;
}
