import { Routes } from "discord.js";
import { readdir } from "fs/promises";
import { extname, join as joinPaths } from "path";
import BaseCommand from "./Structure/BaseCommand";
import type BaseEvent from "./Structure/BaseEvent";
import { DiscordClient } from "./DiscordClient";
import Logger from "@/utils/Logger";

export async function registerCommands(client: DiscordClient) {
	const commandsPath = joinPaths(`${import.meta.dir}`, "..", "commands");

	const commandFiles = (
		await readdir(commandsPath, {
			recursive: true
		})
	).filter(
		(file) =>
			((x: string) => x !== x.toLowerCase())(file[0]) &&
			(extname(file) == ".js" || extname(file) == ".ts")
	);

	for (const file of commandFiles) {
		const filePath = joinPaths(commandsPath, file);

		try {
			const { default: BotCommand }: { default: new () => BaseCommand } =
				await import(filePath);

			const command = new BotCommand();

			if (command instanceof BaseCommand)
				client.commands.set(command.data.name, command);
			else
				Logger.warn(
					`The command at ${filePath} is missing a required "data", "execute" or "category" property. Ignoring.`
				);
		} catch (error) {
			Logger.error(error);
		}
	}
}

export async function registerEvents(client: DiscordClient<true>) {
	const eventsPath = joinPaths(`${import.meta.dir}`, "..", "events");
	const eventFiles = (
		await readdir(eventsPath, {
			recursive: true
		})
	).filter(
		(file) =>
			((x: string) => x !== x.toLowerCase())(file[0]) &&
			(extname(file) == ".js" || extname(file) == ".ts")
	);

	for (const file of eventFiles) {
		const filePath = joinPaths(eventsPath, file);
		const { default: BotEvent }: { default: new () => BaseEvent } =
			await import(filePath);

		const event = new BotEvent();

		client.on(event.name, (...args) => event.execute(client, ...args));
	}
}

export async function syncInteractions(
	client: DiscordClient,
	guildId?: string
) {
	if (!client.application?.id) {
		Logger.error("No application id");
		return;
	}

	let data = [...client.interactionData];

	if (!guildId || guildId !== "576460042774118420")
		data = data.filter(({ name }) =>
			["apply", "feedback"].some((x) => name !== x)
		);

	try {
		await client.rest.put(
			guildId
				? Routes.applicationGuildCommands(
						client.application.id,
						guildId
					)
				: Routes.applicationCommands(client.application.id),
			{ body: data }
		);
	} catch (error) {
		Logger.error(error);
	}
}
