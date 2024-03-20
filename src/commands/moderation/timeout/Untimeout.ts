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

export default class UntimeoutCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("untimeout")
				.setDescription("Untimeout a user (for mods)")
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User to timeout")
						.setRequired(true)
				)
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ModerateMembers
				)
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const user = interaction.options.getUser("user", true);
		const member = await interaction.guild.members.fetch(user.id);

		if (!member.communicationDisabledUntil) {
			await interaction.reply({
				content: "User is not timed out!",
				ephemeral: true
			});

			return;
		}

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId
		);

		if (!guildPreferences) {
			await interaction.reply({
				content:
					"Please setup the bot using the command `/setup` first.",
				ephemeral: true
			});
			return;
		}

		try {
			await member.timeout(null);
		} catch (error) {
			await interaction.reply({
				content: "Failed to untimeout user",
				ephemeral: true
			});

			client.log(error, `${this.data.name} Command`, [
				{ name: "User ID", value: interaction.user.id }
			]);
		}

		const latestPunishment = await Punishment.findOne()
			.sort({ when: -1 });
		
		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		const undoPunishment = await Punishment.findOne({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			action: "Timeout"
		}).sort({ createdAt: 1 });
		await Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Remove Timeout",
			reason: "",
			points: -(undoPunishment?.points ?? 2),
			caseId: caseNumber
		});

		const modEmbed = new EmbedBuilder()
			.setTitle(`Untimeout | Case #${caseNumber}`)
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

		if (guildPreferences.modlogChannelId) {
			await Logger.channel(
				interaction.guild,
				guildPreferences.modlogChannelId,
				{
					embeds: [modEmbed]
				}
			);
		}

		await interaction.reply({
			content: `Successfully timed out @${user.tag}`,
			ephemeral: true
		});
	}
}
