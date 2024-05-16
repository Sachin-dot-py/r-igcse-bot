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
		if (!interaction.channel || !interaction.channel.isTextBased()) return;

		await interaction.deferReply({
			ephemeral: true
		});

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId
		);

		if (!guildPreferences) {
			interaction.editReply({
				content:
					"Please configure the bot using `/setup` command first."
			});
			return;
		}

		const user = interaction.options.getUser("user", true);
		const ban = await interaction.guild.bans
			.fetch(user.id)
			.catch(() => null);

		if (!ban) {
			interaction.editReply({
				content: "I cannot unban a user that isn't banned."
			});

			return;
		}

		const latestPunishment = (
			await Punishment.find({
				guildId: interaction.guildId
			}).sort({ when: -1 })
		)[0];

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		try {
			await interaction.guild.bans.remove(
				user,
				`Unbanned by ${interaction.user.tag}`
			);
		} catch (error) {
			interaction.editReply({
				content: `Failed to unban user ${error instanceof Error ? `(${error.message})` : ""}`
			});

			client.log(
				error,
				`${this.data.name} Command`,
				`**Channel:** <#${interaction.channel?.id}>
					**User:** <@${interaction.user.id}>
					**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`
			);
		}

		Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Unban",
			caseId: caseNumber,
			reason: "",
			points: 0,
			when: new Date()
		});

		if (guildPreferences.modlogChannelId) {
			const modEmbed = new EmbedBuilder()
				.setTitle(`Unban | Case #${caseNumber}`)
				.setColor(Colors.Red)
				.addFields([
					{
						name: "User",
						value: `${user.tag} (${user.id})`,
						inline: false
					},
					{
						name: "Moderator",
						value: `${interaction.user.tag} (${interaction.user.id})`,
						inline: false
					}
				])
				.setTimestamp();

			Logger.channel(
				interaction.guild,
				guildPreferences.modlogChannelId,
				{
					embeds: [modEmbed]
				}
			);
		}

		interaction.editReply({ content: "there ya go good sir" });
		interaction.channel.send(`${user.username} has been unbanned.`);
	}
}
