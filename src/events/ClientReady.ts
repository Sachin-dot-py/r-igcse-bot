import { Events } from 'discord.js';
import BaseEvent from '../utils/Structure/BaseEvent.ts';
import type { DiscordClient } from '../utils/client.ts';

export default class ClientReadyEvent extends BaseEvent {
    constructor() {
        super(Events.ClientReady);
    }

    async execute(client: DiscordClient) {
        console.log(`Ready! Logged in as ${client.user?.tag}`);
    }
}
