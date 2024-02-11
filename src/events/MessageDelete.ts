import { Events, Message } from 'discord.js';
import BaseEvent from '../registry/Structure/BaseEvent';
import type { DiscordClient } from '../registry/client';

const snipe_cache: { [key: string]: string } = {};

export default class MessageDeleteEvent extends BaseEvent {
    constructor() {
        super(Events.MessageDelete);
    }

    async execute(client: DiscordClient, message: Message) {
        snipe_cache[message.channel.id] = message.content;
    }
}
