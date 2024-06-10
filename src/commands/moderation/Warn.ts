import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import sendDm from "@/utils/sendDm";
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
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ModerateMembers,
				)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel || !interaction.channel.isTextBased()) return;

		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason", true);

		await interaction.deferReply({
			ephemeral: true,
		});

		const guildMember = await interaction.guild.members.fetch(user.id);

		if (!guildMember) {
			interaction.editReply({
				content: "User not found in server.",
			});
			return;
		}

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);

		if (!guildPreferences) {
			interaction.editReply({
				content:
					"Please setup the bot using the command `/setup` first.",
			});
			return;
		}

		const latestPunishment = (
			await Punishment.find({
				guildId: interaction.guildId,
			}).sort({ when: -1 })
		)[0];

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Warn",
			caseId: caseNumber,
			reason,
			points: 1,
			when: new Date(),
		});

		if (guildPreferences.modlogChannelId) {
			const modEmbed = new EmbedBuilder()
				.setTitle(`Warn | Case #${caseNumber}`)
				.setColor(Colors.Red)
				.addFields([
					{
						name: "User",
						value: `<@${user.id}>`,
						inline: false
					},
					{
						name: "Moderator",
						value: `<@${interaction.user.id}>`,
						inline: false
					},
					{
						name: "Reason",
						value: reason,
					},
				])
				.setTimestamp();

			Logger.channel(
				interaction.guild,
				guildPreferences.modlogChannelId,
				{
					embeds: [modEmbed],
					allowedMentions: { repliedUser: false }
				}
			);
		}

		sendDm(guildMember, {
			embeds: [
				new EmbedBuilder()
					.setTitle("Warn")
					.setColor(Colors.Red)
					.setDescription(
						`You have been warned in ${interaction.guild.name} for: \`${reason}\`.`,
					),
			],
		});

		interaction.editReply({
			content:
				"https://tenor.com/view/judges-warn-judge-judy-pointing-gif-15838639",
		});
		interaction.channel.send(
			`${user.username} has been warned for ${reason} (Case #${caseNumber})`,
		);
	}
}
