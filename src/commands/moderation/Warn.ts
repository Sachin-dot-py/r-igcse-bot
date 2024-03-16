import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import {
	Colors,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";

export default class WarnCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("warn")
				.setDescription("Warn a user (for mods)")
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User to warn")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("reason")
						.setDescription("Reason for warn")
						.setRequired(true),
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason", true);

		// if (user.id === interaction.user.id) {
		// 	await interaction.reply({
		// 		content: "You cannot warn yourself!",
		// 		ephemeral: true,
		// 	});
		// 	return;
		// }

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);

		if (!guildPreferences) return;

		const latestPunishment = await Punishment.findOne()
			.sort({ createdAt: -1 })
			.exec();

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		await Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Warn",
			caseId: caseNumber,
			reason,
		});

		const modEmbed = new EmbedBuilder()
			.setTitle(`User Warned | Case #${caseNumber}`)
			.setDescription(reason)
			.setColor(Colors.Red)
			.setAuthor({
				name: user.displayName,
				iconURL: user.displayAvatarURL(),
			})
			.addFields([
				{
					name: "User ID",
					value: user.id,
					inline: true,
				},
				{
					name: "Moderator",
					value: interaction.user.displayName,
					inline: true,
				},
			]);

		await Logger.channel(interaction.guild, guildPreferences.modlogChannelId, {
			embeds: [modEmbed],
		});

		await interaction.reply({
			content: `Successfully warned @${user.displayName}`,
			ephemeral: true,
		});
	}
}
