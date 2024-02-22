import { syncCommands } from '@/registry';
import BaseCommand, {
    type DiscordChatInputCommandInteraction,
} from '@/registry/Structure/BaseCommand';
import type { DiscordClient } from '@/registry/client';
import { SlashCommandBuilder } from 'discord.js';

export default class SyncCommandsCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName('sync_commands')
                .setDescription('Sync bot application commands with discord')
                .setDMPermission(false),
        );
    }

    async execute(
        interaction: DiscordChatInputCommandInteraction,
        client: DiscordClient,
    ) {
        try {
            await syncCommands(client, interaction.guildId!);
            await interaction.followUp({
                content: 'Commands synced',
                ephemeral: true,
            });
        } catch (error) {
            await interaction.followUp({
                content: "Couldn't sync commands",
                ephemeral: true,
            });

            // TODO: Error Logging
        }
    }
}
