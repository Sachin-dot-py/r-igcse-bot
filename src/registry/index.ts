import { join as joinPaths, extname } from 'path';
import { readdir } from 'fs/promises';
import { DiscordClient } from './client';

export async function registerCommands(client: DiscordClient) {
    const commandsPath = joinPaths(`${import.meta.dir}`, '..', 'commands');

    const commandFiles = (await readdir(commandsPath)).filter(
        (file) => extname(file) == '.js' || extname(file) == '.ts',
    );

    for (const file of commandFiles) {
        const filePath = joinPaths(commandsPath, file);
        const { default: BotCommand } = await import(filePath);

        const command = new BotCommand();

        if ('data' in command && 'execute' in command)
            client.commands.set(command.data.name, command);
        else
            console.warn(
                `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
            );
    }
}

export async function registerEvents(client: DiscordClient) {
    const eventsPath = joinPaths(`${import.meta.dir}`, '..', 'events');
    const eventFiles = (await readdir(eventsPath)).filter(
        (file) => extname(file) == '.js' || extname(file) == '.ts',
    );

    for (const file of eventFiles) {
        const filePath = joinPaths(eventsPath, file);
        const { default: BotEvent } = await import(filePath);

        const event = new BotEvent();

        client.on(event.name, (...args) => event.execute(client, ...args));
    }
}
