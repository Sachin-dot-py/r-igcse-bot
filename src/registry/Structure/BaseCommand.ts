import {
	ChatInputCommandInteraction,
	CommandInteraction,
	ContextMenuCommandBuilder,
	ContextMenuCommandInteraction,
	MessageContextMenuCommandInteraction,
	SlashCommandBuilder,
	type CacheType,
	type SlashCommandSubcommandsOnlyBuilder
} from "discord.js";
import type { DiscordClient } from "../DiscordClient";

export type DiscordCommandInteraction<Cached extends CacheType = CacheType> =
	Omit<CommandInteraction<Cached>, "client">;

export type DiscordChatInputCommandInteraction<
	Cached extends CacheType = CacheType
> = Omit<ChatInputCommandInteraction<Cached>, "client">;

export type DiscordContextMenuCommandInteraction<
	Cached extends CacheType = CacheType
> = Omit<ContextMenuCommandInteraction<Cached>, "client">;

export type DiscordMessageContextMenuCommandInteraction<
	Cached extends CacheType = CacheType
> = Omit<MessageContextMenuCommandInteraction<Cached>, "client">;

export default abstract class BaseCommand {
	constructor(
		private _data:
			| Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand">
			| SlashCommandSubcommandsOnlyBuilder
			| ContextMenuCommandBuilder
	) {}

	get data() {
		return this._data;
	}

	abstract execute(
		client: DiscordClient<true>,
		interaction: DiscordCommandInteraction
	): Promise<void>;
}
