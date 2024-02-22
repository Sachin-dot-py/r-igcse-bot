import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from 'discord.js';
import BaseCommand from '@/registry/Structure/BaseCommand';
import { GuildPreferences } from '@/mongo';

export default class WarnCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName('warn')
                .setDescription('Warn a user (for mods)')
                .addUserOption((option) =>
                    option
                        .setName('user')
                        .setDescription('User to warn')
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName('reason')
                        .setDescription('Reason for warn')
                        .setRequired(true),
                )
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.ModerateMembers,
                ),
        );
    }

    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);

        if (user.id === interaction.user.id) {
            await interaction.reply({
                content: 'You cannot warn yourself!',
                ephemeral: true,
            });
            return;
        }

        const warnlogChannelId = (
            await GuildPreferences.findOne({
                guildId: interaction.guildId,
            }).exec()
        )?.warnlogChannel;

        if (warnlogChannelId) {
            const warnlogChannel =
                await interaction.guild?.channels.fetch(warnlogChannelId);
        }
    }
}
