import { ActivityType, Events } from 'discord.js';
import BaseEvent from '../registry/Structure/BaseEvent';
import type { DiscordClient } from '../registry/client';
import { syncCommands } from '@/registry';

export default class ClientReadyEvent extends BaseEvent {
    constructor() {
        super(Events.ClientReady);
    }

    async execute(client: DiscordClient) {
        console.log(`Ready! Logged in as ${client.user?.tag}`);

        client.user?.setPresence({
            activities: [{ type: ActivityType.Watching, name: 'r/IGCSE' }],
            status: 'online',
        });

        for (const guild of client.guilds.cache.values())
            await syncCommands(client, guild.id);
    }
}