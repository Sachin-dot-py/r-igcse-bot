import {
	ContextMenuCommandBuilder,
	ContextMenuCommandInteraction,
	type CacheType,
	MessageContextMenuCommandInteraction
} from "discord.js";
import type { DiscordClient } from "../DiscordClient";

export type DiscordContextMenuCommandInteraction<
	Cached extends CacheType = CacheType
> = Omit<ContextMenuCommandInteraction<Cached>, "client">;

export type DiscordMessageContextMenuCommandInteraction<
	Cached extends CacheType = CacheType
> = Omit<MessageContextMenuCommandInteraction<Cached>, "client">;

export default abstract class BaseMenu {
	constructor(private _data: ContextMenuCommandBuilder) {}

	get data() {
		return this._data;
	}

	abstract execute(
		client: DiscordClient<true>,
		interaction: DiscordContextMenuCommandInteraction
	): Promise<void>;
}
