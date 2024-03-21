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
		const member = await interaction.guild.members.cache.get(user.id);

		if (!member) {
			await interaction.reply({
				content: "The specified user isn't a member of this server.",
				ephemeral: true
			});

			return;
		}

		if (!interaction.guild.bans.cache.has(member.id)) {
			await interaction.reply({
				content: "I cannot unban a user that isn't banned.",
				ephemeral: true
			});

			return;
		}

		const latestPunishment = await Punishment.findOne().sort({ when: -1 });

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		try {
			await interaction.guild.bans.remove(member);
		} catch (error) {
			await interaction.reply({
				content: "Failed to unban user",
				ephemeral: true
			});

			client.log(error, `${this.data.name} Command`, [
				{ name: "User ID", value: interaction.user.id }
			]);
		}

		await Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Ban",
			caseId: caseNumber,
			reason: ""
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
				content: `Successfully unbanned ${user.tag}. Please configure your guild preferences for Moderation Action Logging.`,
				ephemeral: true
			});
	}
}
