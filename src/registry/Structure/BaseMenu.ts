import {
	ChatInputCommandInteraction,
	ContextMenuCommandBuilder,
	ContextMenuCommandInteraction,
} from "discord.js";
import type { DiscordClient } from "../client";

export type DiscordChatInputCommandInteraction = Omit<
	ChatInputCommandInteraction,
	"client"
>;

export default abstract class BaseMenu {
	constructor(private _data: ContextMenuCommandBuilder) {}

	get data() {
		return this._data;
	}

	abstract execute(
		interaction: ContextMenuCommandInteraction,
		client: DiscordClient,
	): Promise<void>;
}
