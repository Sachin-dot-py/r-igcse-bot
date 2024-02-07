import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import BaseCommand from '../utils/Structure/BaseCommand';

export default class TestCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder().setName('ping').setDescription('Pong!'),
        );
    }

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply('Pong!');
    }
}
