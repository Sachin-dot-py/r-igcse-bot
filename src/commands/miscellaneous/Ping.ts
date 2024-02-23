import { SlashCommandBuilder } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";

export default class PingCommand extends BaseCommand {
	constructor() {
		super(new SlashCommandBuilder().setName("ping").setDescription("Pong!"));
	}

	async execute(interaction: DiscordChatInputCommandInteraction) {
		await interaction.reply("Pong!");
	}
}
