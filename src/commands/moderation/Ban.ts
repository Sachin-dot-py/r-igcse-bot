import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";
import { SlashCommandBuilder } from "discord.js";
import { lookUpGuildPreference } from "@/mongo/schemas/GuildPreferences";
import { FALLBACK_MODLOG_CHANNEL_ID, PRIMARY_GUILD_ID } from "@/constants";

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
				// .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
				.setDMPermission(false),
		);
	}

	async execute(
		interaction: DiscordChatInputCommandInteraction,
		client: DiscordClient,
	) {
		if (!interaction.guild) return;

		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason", true);
		const deleteMessagesDays =
			interaction.options.getInteger("delete_messages", false) || 0;

		// if (user.id === interaction.user.id) {
		//     await interaction.reply({
		//         content: 'You cannot ban yourself!',
		//         ephemeral: true,
		//     });
		//     return;
		// }

		// if (interaction.guild?.bans.cache.has(user.id)) {
		//     await interaction.followUp({
		//         content: 'User is already banned!',
		//         ephemeral: true,
		//     });
		//     return;
		// }

		try {
			// TODO: Guild Preferences Caching

			const modlogChannelId =
				interaction.guildId === PRIMARY_GUILD_ID
					? FALLBACK_MODLOG_CHANNEL_ID
					: (await lookUpGuildPreference(
							"guildId",
							interaction.guild.id,
							"modlogChannelId",
						)) || FALLBACK_MODLOG_CHANNEL_ID;

			const modlogChannel =
				interaction.guild.channels.cache.get(modlogChannelId);

			if (!modlogChannel || !modlogChannel.isTextBased()) {
				await interaction.reply(
					"Please properly configure your guild preferences.",
				);
				return;
			}

			const lastMessageContent =
				await modlogChannel.messages.cache.last()?.content;

			const caseNumber =
				parseInt(lastMessageContent?.match(/\d/g)?.join("") || "0") + 1;

			// await interaction.guild?.bans.create(user, {
			// 	reason: reason,
			// 	deleteMessageSeconds: deleteMessagesDays * 86400,
			// });

			// await Punishment.create({
			// 	guildId: interaction.guild.id,
			// 	actionAgainst: user.id,
			// 	actionBy: interaction.user.id,
			// 	action: "Ban",
			// 	caseId: caseNumber,
			// 	reason,
			// });

			await interaction.reply({
				content: `Successfully banned @${user.displayName}`,
				ephemeral: true,
			});

			await client.logger.ban(
				user,
				interaction.user,
				interaction.guild,
				reason,
				caseNumber,
				deleteMessagesDays,
				modlogChannel,
			);
		} catch (e) {
			// TODO: Ban failed logging

			await interaction.reply({
				content: "Failed to ban user",
				ephemeral: true,
			});

			client.logger.error(e);
			return;
		}
	}
}
