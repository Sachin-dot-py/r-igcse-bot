import { ActivityType, Events } from 'discord.js';
import BaseEvent from '../registry/Structure/BaseEvent';
import type { DiscordClient } from '../registry/client';

export default class ClientReadyEvent extends BaseEvent {
    constructor() {
        super(Events.ClientReady);
    }

    async execute(client: DiscordClient) {
        client.logger.info(`Logged in as \x1b[1m${client.user?.tag}\x1b[0m`);

        client.user?.setPresence({
            activities: [{ type: ActivityType.Watching, name: 'r/IGCSE' }],
            status: 'online',
        });
    }
}
