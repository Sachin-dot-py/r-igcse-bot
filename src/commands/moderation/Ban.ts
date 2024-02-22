import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from 'discord.js';
import BaseCommand from '@/registry/Structure/BaseCommand';
import { GUILD_ID } from '@/utils/apis/constants';

export default class BanCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName('ban')
                .setDescription('Ban a user from the server (for mods)')
                .addUserOption((option) =>
                    option
                        .setName('user')
                        .setDescription('User to ban')
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName('reason')
                        .setDescription('Reason for ban')
                        .setRequired(true),
                )
                .addIntegerOption((option) =>
                    option
                        .setName('delete messages')
                        .setDescription('Days to delete messages for')
                        .setMaxValue(7)
                        .setMinValue(0)
                        .setRequired(false),
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
        );
    }

    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);
        const deleteMessagesDays =
            interaction.options.getInteger('delete messages', false) || 0;

        // if (user.id === interaction.user.id) {
        //     await interaction.reply({
        //         content: 'You cannot ban yourself!',
        //         ephemeral: true,
        //     });
        //     return;
        // }

        // if (interaction.guild?.bans.cache.has(user.id)) {
        //     await interaction.reply({
        //         content: 'User is already banned!',
        //         ephemeral: true,
        //     });
        //     return;
        // }

        try {
            await interaction.guild?.bans.create(user, {
                reason: reason,
                deleteMessageSeconds: deleteMessagesDays * 86400,
            });

            await user.send(
                `Hi there from ${interaction.guild?.name}. You have been banned from the server due to '${reason}'.${interaction.guild?.id === GUILD_ID ? ' If you feel this ban was done in error, to appeal your ban, please fill the form below.\nhttps://forms.gle/8qnWpSFbLDLdntdt8' : ''}`,
            );

            await interaction.followUp({
                content: `Successfully banned @${user.displayName}`,
                ephemeral: true,
            });
        } catch (e) {
            await interaction.followUp({
                content: 'Failed to ban user',
                ephemeral: true,
            });

            console.error(e);
            return;
        }
    }
}
