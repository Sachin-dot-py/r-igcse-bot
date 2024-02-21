import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import BaseCommand from '../registry/Structure/BaseCommand';
import { getJoke, type JokeCategory } from '../utils/apis/joke';

export default class JokeCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName('joke')
                .setDescription('Get a random joke')
                .addStringOption((option) =>
                    option
                        .setName('category')
                        .setDescription('specify category')
                        .addChoices({
                            name: 'programming',
                            value: 'Programming',
                        }),
                ),
        );
    }

    async execute(interaction: ChatInputCommandInteraction) {
        const category = interaction.options.getString('subreddit', false);
        const categories: JokeCategory[] = category
            ? [category as JokeCategory]
            : ['Misc', 'Dark', 'Pun'];

        await interaction.deferReply();

        const joke = await getJoke(categories);

        await interaction.followUp(joke);
    }
}
