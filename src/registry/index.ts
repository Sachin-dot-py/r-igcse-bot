import { join as joinPaths, extname } from 'path';
import { readdir } from 'fs/promises';
import { DiscordClient } from './client';
import type BaseCommand from './Structure/BaseCommand';
import type BaseEvent from './Structure/BaseEvent';
import { REST, Routes } from 'discord.js';

export async function registerCommands(
    client: DiscordClient,
    category: string = '',
) {
    const commandsPath = joinPaths(
        `${import.meta.dir}`,
        '..',
        'commands',
        category,
    );

    const commandItems = await readdir(commandsPath, { withFileTypes: true });

    commandItems
        .filter((dirent) => dirent.isDirectory())
        .forEach((dirent) => registerCommands(client, dirent.name));

    const commandFiles = commandItems
        .filter((dirent) => dirent.isFile())
        .map((dirent) => dirent.name);

    for (const file of commandFiles) {
        const filePath = joinPaths(commandsPath, file);
        try {
            const { default: BotCommand }: { default: new () => BaseCommand } =
                await import(filePath);

            const command = new BotCommand();

            if (
                'data' in command &&
                'execute' in command &&
                'category' in command
            ) {
                command.category = category;
                client.commands.set(command.data.name, command);
            } else
                console.warn(
                    `[WARNING] The command at ${filePath} is missing a required "data", "execute" or "category" property. Ignoring.`,
                );
        } catch (error) {
            console.error(error);
        }
    }
}

export async function registerEvents(client: DiscordClient) {
    const eventsPath = joinPaths(`${import.meta.dir}`, '..', 'events');
    const eventFiles = (
        await readdir(eventsPath, {
            recursive: true,
        })
    ).filter((file) => extname(file) == '.js' || extname(file) == '.ts');

    for (const file of eventFiles) {
        const filePath = joinPaths(eventsPath, file);
        const { default: BotEvent }: { default: new () => BaseEvent } =
            await import(filePath);

        const event = new BotEvent();

        client.on(event.name, (...args) => event.execute(client, ...args));
    }
}

export async function syncCommands(client: DiscordClient, guildId: string) {
    return await client.rest.put(
        Routes.applicationGuildCommands(client.application?.id!, guildId),
        { body: client.commands },
    );
}
