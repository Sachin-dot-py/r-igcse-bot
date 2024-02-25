import {
	Client,
	Collection,
	type ClientOptions,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import Logger from "@/utils/Logger";

export class DiscordClient extends Client {
	private _commands = new Collection<
		string,
		RESTPostAPIChatInputApplicationCommandsJSONBody
	>();
	private _logger: Logger;

	constructor(options: ClientOptions) {
		super(options);
		this._logger = new Logger(this);
	}

	get commands() {
		return this._commands;
	}

	get logger() {
		return this._logger;
	}
}
