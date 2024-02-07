import { Events } from 'discord.js';
import BaseEvent from '../registry/Structure/BaseEvent';
import type { DiscordClient } from '../registry/client';

export default class ClientReadyEvent extends BaseEvent {
    constructor() {
        super(Events.ClientReady);
    }

    async execute(client: DiscordClient) {
        console.log(`Ready! Logged in as ${client.user?.tag}`);
    }
}
