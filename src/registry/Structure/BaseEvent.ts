import type { DiscordClient } from '../client';

export default abstract class BaseEvent {
    constructor(private _name: string) {}

    get name() {
        return this._name;
    }

    abstract execute(client: DiscordClient, ...args: any): Promise<void>;
}
