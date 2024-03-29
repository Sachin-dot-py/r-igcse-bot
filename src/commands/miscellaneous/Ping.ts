import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";

export default class PingCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder().setName("ping").setDescription("Pong!")
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction
	) {
		await interaction.deferReply();
		const deferredReply = await interaction.fetchReply();

		const embed = new EmbedBuilder().setAuthor({
			name: `Pong! | Client: ${deferredReply.createdTimestamp - interaction.createdTimestamp}ms | WebSocket: ${client.ws.ping}`,
			iconURL: client.user.displayAvatarURL()
		});

		await interaction.followUp({
			embeds: [embed]
		});
	}
}
