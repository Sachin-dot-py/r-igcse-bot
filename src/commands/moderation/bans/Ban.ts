import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { logToChannel } from "@/utils/Logger";
import sendDm from "@/utils/sendDm";
import {
	Colors,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	MessageFlags
} from "discord.js";

export default class BanCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("ban")
				.setDescription("Ban a user from the server (for mods)")
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User to ban")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("reason")
						.setDescription("Reason for ban")
						.setRequired(true),
				)
				.addIntegerOption((option) =>
					option
						.setName("delete_messages")
						.setDescription("Days to delete messages for")
						.setMaxValue(7)
						.setMinValue(0)
						.setRequired(false),
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
		const reason = interaction.options.getString("reason", true);
		const deleteMessagesDays =
			interaction.options.getInteger("delete_messages", false) ?? 0;

		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		if (user.id === interaction.user.id) {
			interaction.editReply({
				content:
					"Well hey, you can't ban yourself ||but **please** ask someone else to do it||!",
			});
			return;
		}

		if (await interaction.guild.bans.fetch(user.id).catch(() => null)) {
			interaction.editReply({
				content: "I cannot ban a user that's already banned.",
			});
			return;
		}

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);

		if (!guildPreferences) {
			await interaction.editReply({
				content:
					"Please configure the bot using `/setup` command first.",
			});
			return;
		}

		const dmEmbed = new EmbedBuilder()
			.setTitle(`You have been banned from ${interaction.guild.name}!`)
			.setDescription(
				`You have been banned from **${
					interaction.guild.name
				}** due to \`${reason}\`. ${
					guildPreferences.banAppealFormLink
						? `Please fill the appeal form [here](${guildPreferences.banAppealFormLink}) to appeal your ban.`
						: ""
				}`,
			)
			.setColor(Colors.Red);

		const guildMember = await interaction.guild.members.fetch(user.id);

		if (guildMember) {
			if (!guildMember.bannable) {
				await interaction.editReply({
					content: "I cannot ban this user. (Missing permissions)",
				});
				return;
			}

			const memberHighestRole = guildMember.roles.highest;
			const modHighestRole = interaction.member.roles.highest;

			if (memberHighestRole.comparePositionTo(modHighestRole) >= 0) {
				interaction.editReply({
					content:
						"You cannot ban this user due to role hierarchy! (Role is higher or equal to yours)",
				});
				return;
			}

			sendDm(guildMember, {
				embeds: [dmEmbed],
			});
		}

		try {
			await interaction.guild.bans.create(user, {
				reason: `${reason} | By: ${interaction.user.tag} `,
				deleteMessageSeconds: deleteMessagesDays * 86400,
			});
		} catch (error) {
			interaction.editReply({
				content: `Failed to ban user ${
					error instanceof Error ? `(${error.message})` : ""
				}`,
			});

			client.log(
				error,
				`${this.data.name} Command`,
				`
	* * Channel:** <#${interaction.channel?.id} >

			  	

					**User:** <@${interaction.user.id}>
					**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
			);

			return;
		}

		const caseNumber =
			(
				await Punishment.find({
					guildId: interaction.guildId,
				})
			).length + 1;

		Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Ban",
			caseId: caseNumber,
			reason,
			points: 0,
			when: new Date(),
		});

		interaction.channel.send(
			`${user.username} has been banned. (Case #${caseNumber})`,
		);

		if (guildPreferences.modlogChannelId) {
			const modEmbed = new EmbedBuilder()
				.setTitle(`Ban | Case #${caseNumber}`)
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
					{
						name: "Reason",
						value: reason,
					},
				])
				.setTimestamp();

			logToChannel(interaction.guild, guildPreferences.modlogChannelId, {
				embeds: [modEmbed],
			});
		}

		interaction.editReply({
			content:
				"https://giphy.com/gifs/ban-banned-admin-fe4dDMD2cAU5RfEaCU",
		});
	}
}
