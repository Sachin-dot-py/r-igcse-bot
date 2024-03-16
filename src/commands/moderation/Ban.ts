import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	Colors,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
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
		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason", true);
		const deleteMessagesDays =
			interaction.options.getInteger("delete_messages", false) ?? 0;

		// if (user.id === interaction.user.id) {
		//     await interaction.reply({
		//         content: 'You cannot ban yourself!',
		//         ephemeral: true,
		//     });
		//     return;
		// }

		// if (interaction.guild.bans.cache.has(user.id)) {
		//     await interaction.reply({
		//         content: 'User is already banned!',
		//         ephemeral: true,
		//     });
		//     return;
		// }

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);

		if (!guildPreferences) return;

		const latestPunishment = await Punishment.findOne()
			.sort({ createdAt: -1 })
			.exec();

		const caseNumber = latestPunishment?.caseId ?? 0;

		const dmEmbed = new EmbedBuilder()
			.setTitle(`You have been banned from ${interaction.guild.name}!`)
			.setDescription(
				`Hi there from ${interaction.guild.name}. You have been banned from the server due to \`${reason}\`. ${guildPreferences.banAppealFormLink ? `If you feel this ban was done in error, to appeal your ban, please fill the form [here](${guildPreferences.banAppealFormLink}).` : ""}`,
			)
			.setColor(Colors.Red);

		await user.send({
			embeds: [dmEmbed],
		});

		try {
			await interaction.guild.bans.create(user, {
				reason: reason,
				deleteMessageSeconds: deleteMessagesDays * 86400,
			});
		} catch (error) {
			await interaction.reply({
				content: "Failed to ban user",
				ephemeral: true,
			});

			const botlogChannel = interaction.guild.channels.cache.get(
				guildPreferences.botlogChannelId,
			);

			if (!botlogChannel || !botlogChannel.isTextBased()) return;

			const embed = new EmbedBuilder()
				.setAuthor({
					name: "Error | Banning User",
					iconURL: interaction.user.displayAvatarURL(),
				})
				.setDescription(`${error}`);

			await botlogChannel.send({
				embeds: [embed],
			});
		}

		await Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Ban",
			caseId: caseNumber,
			reason,
		});

		const modlogChannel = interaction.guild.channels.cache.get(
			guildPreferences.modlogChannelId,
		);

		if (modlogChannel && modlogChannel.isTextBased()) {
			const modEmbed = new EmbedBuilder()
				.setTitle(`User Banned | Case #${caseNumber}`)
				.setDescription(reason)
				.setFooter({
					text: `${deleteMessagesDays} days of messages deleted`,
				})
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

			await modlogChannel.send({ embeds: [modEmbed] });
		}

		await interaction.reply({
			content: `Successfully banned @${user.displayName}`,
			ephemeral: true,
		});
	}
}
