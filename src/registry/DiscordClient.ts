import {
	Client,
	Collection,
	type ClientOptions,
	type RESTPostAPIApplicationCommandsJSONBody,
	type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord.js";
import type BaseCommand from "./Structure/BaseCommand";
import type BaseMenu from "./Structure/BaseMenu";

export class DiscordClient extends Client {
	private _commands = new Collection<string, BaseCommand>();
	private _menus = new Collection<string, BaseMenu>();

	private _stickyChannelIds: string[] = [];
	private _stickyCounter: Record<string, number> = {};

	constructor(options: ClientOptions) {
		super(options);
	}

	get stickyChannelIds() {
		return this._stickyChannelIds;
	}

	set stickyChannelIds(channelIds: string[]) {
		this._stickyChannelIds = channelIds;
	}

	get stickyCounter() {
		return this._stickyCounter;
	}

	set stickyCounter(counts: Record<string, number>) {
		this._stickyCounter = counts;
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
}
