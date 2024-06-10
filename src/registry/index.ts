import { extname, join as joinPaths } from "path";
import Logger from "@/utils/Logger";
import { Routes } from "discord.js";
import { readdir } from "fs/promises";
import type { DiscordClient } from "./DiscordClient";
import BaseCommand from "./Structure/BaseCommand";
import type BaseEvent from "./Structure/BaseEvent";

export async function registerCommands(client: DiscordClient, path = "") {
	const commandsPath = joinPaths(
		`${import.meta.dir}`,
		"..",
		"commands",
		path,
	);

	const commandItems = await readdir(commandsPath, { withFileTypes: true });

	commandItems
		.filter((dirent) => dirent.isDirectory())
		.forEach((dirent) =>
			registerCommands(client, joinPaths(path, dirent.name)),
		);

	const commandFiles = commandItems
		.filter(
			(dirent) =>
				dirent.isFile() &&
				((x: string) => x !== x.toLowerCase())(dirent.name[0]),
		)
		.map((dirent) => dirent.name);

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
					`The command at ${filePath} is missing a required "data", "execute" or "category" property. Ignoring.`,
				);
		} catch (error) {
			Logger.error(error);
		}
	}
}

export async function registerEvents(client: DiscordClient) {
	const eventsPath = joinPaths(`${import.meta.dir}`, "..", "events");
	const eventFiles = (
		await readdir(eventsPath, {
			recursive: true,
		})
	).filter(
		(file) =>
			((x: string) => x !== x.toLowerCase())(file[0]) &&
			(extname(file) == ".js" || extname(file) == ".ts"),
	);

	for (const file of eventFiles) {
		const filePath = joinPaths(eventsPath, file);
		const { default: BotEvent }: { default: new () => BaseEvent } =
			await import(filePath);

		const event = new BotEvent();

		client.on(event.name, (...args) =>
			event.execute(client as DiscordClient<true>, ...args),
		);
	}
}

export async function syncCommands(client: DiscordClient<true>) {
	const globalCommands = [];
	const mainGuildCommands = [];

	for (const [data, mainGuildOnly] of client.interactionData)
		if (mainGuildOnly) mainGuildCommands.push(data);
		else globalCommands.push(data);

	if (globalCommands.length > 0)
		await client.rest.put(
			Routes.applicationCommands(client.application.id),
			{
				body: globalCommands,
			},
		);

	if (mainGuildCommands.length > 0)
		await client.rest.put(
			Routes.applicationGuildCommands(
				client.application.id,
				process.env.MAIN_GUILD_ID,
			),
			{
				body: mainGuildCommands,
			},
		);
}
