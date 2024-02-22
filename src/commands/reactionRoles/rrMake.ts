import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from 'discord.js';
import BaseCommand from '@/registry/Structure/BaseCommand';

export default class rrMakeCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName('rrmake')
                .setDescription('Create reaction roles')
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.ManageMessages |
                        PermissionFlagsBits.ManageRoles,
                )
                .setDMPermission(false),
        );
    }

    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);

        // if (user.id === interaction.user.id) {
        //     await interaction.followUp({
        //         content: 'You cannot kick yourself!',
        //         ephemeral: true,
        //     });
        //     return;
        // }

        try {
            await interaction.guild?.members.kick(user, reason);

            await user.send(
                `Hi there from ${interaction.guild?.name}. You have been kicked from the server due to '${reason}'.`,
            );

            await interaction.followUp({
                content: `Successfully kicked @${user.displayName}`,
                ephemeral: true,
            });
        } catch (e) {
            await interaction.followUp({
                content: 'Failed to kick user',
                ephemeral: true,
            });

            console.error(e);
            return;
        }
    }
}
