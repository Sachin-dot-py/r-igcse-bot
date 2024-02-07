import { Events, type Interaction } from 'discord.js';
import BaseEvent from '../registry/Structure/BaseEvent';
import type { DiscordClient } from '../registry/client';

export default class InteractionCreateEvent extends BaseEvent {
    constructor() {
        super(Events.InteractionCreate);
    }

    async execute(client: DiscordClient, interaction: Interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(
                `No command matching ${interaction.commandName} was found.`,
            );
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);

            if (interaction.replied || interaction.deferred)
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    ephemeral: true,
                });
            else
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    ephemeral: true,
                });
        }
    }
}
