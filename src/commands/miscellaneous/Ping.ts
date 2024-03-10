import { SlashCommandBuilder } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";

export default class PingCommand extends BaseCommand {
	constructor() {
		super(new SlashCommandBuilder().setName("ping").setDescription("Pong!"));
	}

	async execute(
		client: DiscordClient,
		interaction: DiscordChatInputCommandInteraction,
	) {
		await interaction.reply(
			`Pong! | ${Date.now() - interaction.createdTimestamp}`,
		);
	}
}
