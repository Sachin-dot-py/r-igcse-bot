import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import {
	Colors,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder
} from "discord.js";

export default class UnbanCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("unban")
				.setDescription("Unban a user from the server (for mods)")
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User to unban")
						.setRequired(true)
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const user = interaction.options.getUser("user", true);

		if (!interaction.guild.bans.cache.has(user.id)) {
			await interaction.reply({
				content: "I cannot unban a user that isn't banned.",
				ephemeral: true
			});

			return;
		}

		const latestPunishment = await Punishment.findOne().sort({ when: -1 });

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		try {
			await interaction.guild.bans.remove(user, `Unbanned by ${interaction.user.tag}`)
		} catch (error) {
			await interaction.reply({
				content: `Failed to unban user ${error instanceof Error ? `(${error.message})` : ""}`,
				ephemeral: true
			});

			client.log(error, `${this.data.name} Command`, [
				{ name: "User ID", value: interaction.user.id }
			]);
			return;
		}

		await Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Unban",
			caseId: caseNumber,
			reason: "",
			points: 0,
			when: new Date()
		});

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId
		);

		if (guildPreferences && guildPreferences.modlogChannelId) {
			const modEmbed = new EmbedBuilder()
				.setTitle(`Unban | Case #${caseNumber}`)
				.setColor(Colors.Red)
				.addFields([
					{
						name: "User",
						value: `${user.tag} (${user.id})`,
						inline: true
					},
					{
						name: "Moderator",
						value: `${interaction.user.tag} (${interaction.user.id})`,
						inline: true
					}
				])
				.setTimestamp();

			await Logger.channel(
				interaction.guild,
				guildPreferences.modlogChannelId,
				{
					embeds: [modEmbed]
				}
			);

			await interaction.reply({
				content: `Successfully unbanned ${user.tag}`,
				ephemeral: true
			});
		} else
			await interaction.reply({
				content: `Successfully unbanned ${user.tag}. Please configure your guild preferences for Moderation Action Logging using /setup.`,
				ephemeral: true
			});
	}
}
