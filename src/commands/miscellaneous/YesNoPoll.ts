import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    messageLink,
} from 'discord.js';
import BaseCommand from '@/registry/Structure/BaseCommand';

export default class YesNoPollCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName('yesnopoll')
                .setDescription('Create a new in-channel poll')
                .addStringOption((option) =>
                    option
                        .setName('poll')
                        .setDescription('The poll to be created')
                        .setRequired(true),
                ),
        );
    }

    async execute(interaction: ChatInputCommandInteraction) {
        const poll = interaction.options.getString('poll', true);

        await interaction.followUp({
            content: 'Creating poll...',
            ephemeral: true,
        });

        const embed = new EmbedBuilder()
            .setTitle(poll)
            .setDescription(`Total Votes: 0\n\n${'🟩'.repeat(10)}`)
            .setAuthor({
                name: interaction.user.displayName,
                iconURL: interaction.user.displayAvatarURL(),
            });

        try {
            const message = await interaction.channel?.send({
                embeds: [embed],
            });

            await message?.react('🟩');
            await message?.react('🟥');
        } catch (e) {
            await interaction.followUp({
                content: 'Failed to create poll',
                ephemeral: true,
            });
            console.error(e);
        }
    }
}
