import {
	Client,
	Collection,
	type ClientOptions,
	type RESTPostAPIApplicationCommandsJSONBody,
	type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord.js";
import type BaseCommand from "./Structure/BaseCommand";
import Logger from "@/utils/Logger";
import type BaseMenu from "./Structure/BaseMenu";

export class DiscordClient extends Client {
	private _commands = new Collection<string, BaseCommand>();
	private _menus = new Collection<string, BaseMenu>();
	private _logger: Logger;

	constructor(options: ClientOptions) {
		super(options);
		this._logger = new Logger(this);
	}

	get commands() {
		return this._commands;
	}

	get menus() {
		return this._menus;
	}

	get interactionData() {
		return this._menus
			.map<
				| RESTPostAPIApplicationCommandsJSONBody
				| RESTPostAPIContextMenuApplicationCommandsJSONBody
			>((menu) => menu.data.toJSON())
			.concat(this._commands.map((menu) => menu.data.toJSON()));
	}

	get logger() {
		return this._logger;
	}
}
