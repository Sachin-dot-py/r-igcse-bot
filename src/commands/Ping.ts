import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import BaseCommand from '@/registry/Structure/BaseCommand';

export default class PingCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder().setName('ping').setDescription('Pong!'),
        );
    }

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply('Pong!');
    }
}
