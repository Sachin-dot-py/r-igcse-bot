import { syncInteractions } from "@/registry";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { GuildPreferencesCache } from "@/redis";
import Logger from "@/utils/Logger";

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

			const embed = new EmbedBuilder()
				.setAuthor({
					name: "Failed: Sync Commands",
					iconURL: client.user.displayAvatarURL(),
				})
				.setDescription(`${error}`)
				.setTimestamp(Date.now());

			await Logger.channel(
				interaction.guild,
				guildPreferences.botlogChannelId,
				{
					embeds: [embed],
				},
			);
		}
	}
}
