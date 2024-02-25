import BaseMenu from "@/registry/Structure/BaseMenu";
import type { DiscordClient } from "@/registry/client";
import {
	ContextMenuCommandBuilder,
	ContextMenuCommandInteraction,
} from "discord.js";

export default class StickMessageMenu extends BaseMenu {
	constructor() {
		super(new ContextMenuCommandBuilder().setName("Stick Message"));
	}

	// TODO: Stick Context Menu
	async execute(
		interaction: ContextMenuCommandInteraction,
		client: DiscordClient,
	) {
		return;
	}
}
