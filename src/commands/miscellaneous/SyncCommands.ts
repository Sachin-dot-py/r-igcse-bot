import { syncInteractions } from "@/registry";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { GuildPreferencesCache } from "@/redis";

export default class SyncCommandsCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("sync_commands")
				.setDescription("Sync bot application commands with discord")
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		try {
			await syncInteractions(client, interaction.guildId);

			interaction.reply({
				content: "Commands synced",
				ephemeral: true,
			});
		} catch (error) {
			interaction.reply({
				content: "Couldn't sync commands",
				ephemeral: true,
			});

			const guildPreferences = await GuildPreferencesCache.get(
				interaction.guildId,
			);

			const botlogChannelId = guildPreferences.botlogChannelId;

			const botlogChannel =
				await interaction.guild.channels.cache.get(botlogChannelId);

			if (!botlogChannel || !botlogChannel.isTextBased()) return;

			const embed = new EmbedBuilder()
				.setAuthor({
					name: "Failed: Sync Commands",
					iconURL: client.user.displayAvatarURL(),
				})
				.setDescription(`${error}`)
				.setTimestamp(Date.now());

			botlogChannel.send({
				embeds: [embed],
			});
		}
	}
}
