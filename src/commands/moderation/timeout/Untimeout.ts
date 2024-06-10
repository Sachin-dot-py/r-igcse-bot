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
		const member = await interaction.guild.members.fetch(user.id);

		await interaction.deferReply({
			ephemeral: true,
		});

		if (!member.isCommunicationDisabled()) {
			interaction.editReply({
				content: "User is not timed out!",
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

		try {
			await member.timeout(null);
			sendDm(member, {
				embeds: [
					new EmbedBuilder()
						.setTitle("Removed Timeout")
						.setColor(Colors.Red)
						.setDescription(
							`Your timeout in ${interaction.guild.name} has been removed by a moderator. You can now chat again, make sure to follow the rules.`,
						),
				],
			});
		} catch (error) {
			interaction.editReply({
				content: `Failed to untimeout user ${error instanceof Error ? `(${error.message})` : ""}`,
			});

			client.log(
				error,
				`${this.data.name} Command`,
				`**Channel:** <#${interaction.channel?.id}>
					**User:** <@${interaction.user.id}>
					**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
			);
		}

		const latestPunishment = (
			await Punishment.find({
				guildId: interaction.guildId,
			}).sort({ when: -1 })
		)[0];

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		const undoPunishment = (
			await Punishment.find({
				guildId: interaction.guild.id,
				actionAgainst: user.id,
				action: "Timeout",
			}).sort({ when: -1 })
		)[0];

		await Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Remove Timeout",
			reason: "",
			points: -(undoPunishment?.points ?? 2),
			caseId: caseNumber,
			when: new Date(),
		});

		if (guildPreferences.modlogChannelId) {
			const modEmbed = new EmbedBuilder()
				.setTitle(`Untimeout | Case #${caseNumber}`)
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
					}
				]);

			Logger.channel(
				interaction.guild,
				guildPreferences.modlogChannelId,
				{
					embeds: [modEmbed],
					allowedMentions: { repliedUser: false }
				}
			);
		}

		interaction.editReply({ content: "there ya go good sir" });
		interaction.channel.send(
			`Timeout has been removed from ${user.username}`,
		);
	}
}
