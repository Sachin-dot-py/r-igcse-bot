import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import sendDm from "@/utils/sendDm";
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

		if (!member.isCommunicationDisabled()) {
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
			await sendDm(member, {
				embeds: [
					new EmbedBuilder()
						.setTitle("Removed Timeout")
						.setColor(Colors.Red)
						.setDescription(
							`Your timeout in ${interaction.guild.name} has been removed by a moderator. You can now chat again, make sure to follow the rules.`
						)
				]
			});
		} catch (error) {
			await interaction.reply({
				content: `Failed to untimeout user ${error instanceof Error ? `(${error.message})` : ""}`,
				ephemeral: true
			});

			client.log(error, `${this.data.name} Command`, 
					`**Channel:** <#${interaction.channel?.id}>
					**User:** <@${interaction.user.id}>
					**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`); 

			return;
		}

		const latestPunishment = await Punishment.findOne({
			guildId: interaction.guildId
		}).sort({ when: -1 });

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		const undoPunishment = await Punishment.findOne({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			action: "Timeout"
		}).sort({ when: -1 });

		await Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Remove Timeout",
			reason: "",
			points: -(undoPunishment?.points ?? 2),
			caseId: caseNumber,
			when: new Date()
		});

		const modEmbed = new EmbedBuilder()
			.setTitle(`Untimeout | Case #${caseNumber}`)
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
			]);

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
			content: `Timeout has been removed from ${user.username}`,
			ephemeral: true
		});
	}
}
