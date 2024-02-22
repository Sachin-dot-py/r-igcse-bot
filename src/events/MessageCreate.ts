import { Events, Message } from 'discord.js';
import BaseEvent from '../registry/Structure/BaseEvent';
import type { DiscordClient } from '../registry/client';
import { GuildPreferences, Reputation } from '@/mongo';

export default class MessageCreateEvent extends BaseEvent {
    constructor() {
        super(Events.MessageCreate);
    }

    async execute(client: DiscordClient, message: Message) {
        if (message.author.bot) return;

        const referenceMessage = await message.fetchReference();

        if (
            referenceMessage.author.bot ||
            referenceMessage.author.id === message.author.id
        )
            return;

        const channelId =
            message.channel.isThread() && !message.channel.isThreadOnly()
                ? message.channel.parentId!
                : message.channelId;

        const guildPreferences = await GuildPreferences.findOne({
            guildId: message.guildId,
        }).exec();
        const repDisabledChannels = guildPreferences?.repDisabledChannels || [];

        if (
            !message.reference ||
            repDisabledChannels.some((id) => id === channelId) ||
            !(guildPreferences?.repEnabled || true)
        )
            return;

        const rep = [];

        if (
            [
                "you're welcome",
                // 'your welcome',
                'ur welcome',
                'no problem',
                'np',
                'yw',
            ].some((phrase) => message.content.toLowerCase().includes(phrase))
        )
            rep.push(message.author);

        if (
            [
                'ty',
                'thanks',
                'thank',
                'thank you',
                'thx',
                'tysm',
                'thank u',
                'thnks',
                'tanks',
                'thanku',
                'tyvm',
                'thankyou',
            ].some((phrase) => message.content.toLowerCase().includes(phrase))
        )
            rep.push(referenceMessage.author);

        for (const user of rep) {
            const member = await message.guild?.members.fetch(user.id);

            if (!member) return;

            const res = await Reputation.findOneAndUpdate(
                {
                    guildId: message.guildId,
                    userId: member.id,
                },
                {
                    $inc: {
                        rep: 1,
                    },
                },
                {
                    upsert: true,
                },
            ).exec();

            const rep = res?.rep;

            if ([100, 500, 1000, 5000].some((amnt) => rep === amnt)) {
                const role = message.guild?.roles.cache.get(`${rep}+ Rep Club`);
                message.channel.send(
                    `Gave +1 Rep to <@${member.id}> (${rep})${role ? `\nWelcome to the ${role.name}` : ''}`,
                );

                if (!role) return;

                member.roles.add(role);
            }
        }
    }
}
