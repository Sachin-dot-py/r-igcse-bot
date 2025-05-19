import { ConfessionBan } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { logToChannel } from "@/utils/Logger";
import {
	Colors,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";

interface IBannedData {
	_id: string;
	bannedUsers: { _id: string; userHash: string }[];
}

export default class ConfessionUnban extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("confession_unban")
				.setDescription("Unban a user from confessions (for mods)")
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User that you want to unban")
						.setRequired(true),
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel || !interaction.channel.isTextBased()) return;

		const user = interaction.options.getUser("user", true);

		await interaction.deferReply({
			flags: 64,
		});

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);

		const bannedQuery: IBannedData[] | null =
			(await ConfessionBan.aggregate([
				{
					$match: {
						guildId: interaction.guild.id,
					},
				},
				{
					$group: {
						_id: "$guildId",
						bannedUsers: {
							$push: {
								_id: "$_id",
								userHash: "$userHash",
							},
						},
					},
				},
			])) ?? null;

		const bannedUsers = bannedQuery[0]?.bannedUsers || [];

		let idToUnban = null;

		for (const bannedUser of bannedUsers) {
			if (
				await Bun.password.verify(
					interaction.user.id,
					bannedUser.userHash,
				)
			) {
				idToUnban = bannedUser._id;
				break;
			}
		}

		if (idToUnban === null) {
			interaction.editReply({
				content: "This user isn't banned from confessions.",
			});
			return;
		}

		await ConfessionBan.findByIdAndDelete(idToUnban);

		if (guildPreferences?.modlogChannelId) {
			const modEmbed = new EmbedBuilder()
				.setTitle("Confession Unban")
				.setColor(Colors.Red)
				.addFields([
					{
						name: "User",
						value: `${user.tag} (${user.id})`,
						inline: false,
					},
					{
						name: "Moderator",
						value: `${interaction.user.tag} (${interaction.user.id})`,
						inline: false,
					},
				])
				.setTimestamp();

			logToChannel(interaction.guild, guildPreferences.modlogChannelId, {
				embeds: [modEmbed],
			});
		}

		interaction.editReply({
			content:
				"https://tenor.com/view/spooky-season-skeleton-dance-dancing-skeleton-gif-15410799",
		});
		interaction.channel.send({
			content: `${user.username} has been unbanned from confessions.`,
		});
	}
}
