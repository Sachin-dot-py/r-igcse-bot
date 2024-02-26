import { syncInteractions } from "@/registry";
import {
	ActivityType,
	ChannelType,
	Colors,
	EmbedBuilder,
	Events,
} from "discord.js";
import BaseEvent from "../registry/Structure/BaseEvent";
import type { DiscordClient } from "../registry/client";
import { GuildPreferences } from "@/mongo";
import { BETA } from "@/constants";

export default class ClientReadyEvent extends BaseEvent {
	constructor() {
		super(Events.ClientReady);
	}

	async execute(client: DiscordClient) {
		if (!client.user) return;

		client.logger.info(`Logged in as \x1b[1m${client.user.tag}\x1b[0m`);

		client.user.setPresence({
			activities: [{ type: ActivityType.Watching, name: "r/IGCSE" }],
			status: "online",
		});

		await syncInteractions(client, "576460042774118420");

		const { format: timeFormatter } = new Intl.DateTimeFormat("en-GB", {
			year: "numeric",
			month: "numeric",
			day: "numeric",
		});

		for (const guild of client.guilds.cache.values()) {
			// TODO: Cache all guild prefs from the start
			const guildPrefs = await GuildPreferences.findOne({
				guildId: guild.id,
			}).exec();

			// TODO: Implement warning for server to set their guild prefs
			if (!guildPrefs) continue;

			const botlogChannel = await guild.channels.cache.get(
				guildPrefs.botlogChannelId,
			);

			if (!guild || !botlogChannel || !botlogChannel.isTextBased()) return;

			const readyEmbed = new EmbedBuilder()
				.setTitle(`${client.user.displayName} restarted successfully!`)
				.setColor(Colors.Green)
				.setAuthor({
					name: client.user.displayName,
					iconURL: client.user.displayAvatarURL(),
				})
				.addFields([
					{
						name: "Bot Information",
						value: `\`\`\`Name: ${client.user.displayName}\nCreated on: ${timeFormatter(client.user.createdAt)}\nJoined on: ${timeFormatter(guild.joinedAt)}\nBeta: ${BETA}\nVerified: ${client.user.flags?.has("VerifiedBot")}\nNo. of guilds: ${client.guilds.cache.size}\nID: ${client.user.id}\`\`\``,
						inline: false,
					},
					{
						name: "Guild Information",
						value: `\`\`\`Name: ${guild.name}\nOwner: ${(await guild.fetchOwner()).displayName}}\nCreated on: ${timeFormatter(guild.createdAt)}\nMembers: ${guild.memberCount}\nBoosts: ${guild.premiumSubscriptionCount}\nID: ${guild.id}\`\`\``,
						inline: false,
					},
					{
						name: "Role Statistics",
						value: `\`\`\`No. of roles: ${guild.roles.cache.size}\nNo. of members: ${guild.memberCount}\nIGCSE Helpers: ${guild.roles.cache.get(guildPrefs.igHelperRoleId)!.members.size}\nAS/AL Helpers: ${guild.roles.cache.get(guildPrefs.alHelperRoleId)!.members.size}\nStaff Moderators: ${guild.roles.cache.get(guildPrefs.moderatorRoleId)!.members.size}\nTemp Moderators: ${guild.roles.cache.get(guildPrefs.tempModRoleId)!.members.size}\nChat Moderators: ${guild.roles.cache.get(guildPrefs.chatModRoleId)!.members.size}\`\`\``,
						inline: false,
					},
					{
						name: "Channels & Commands",
						value: `\`\`\`No. of users: ${guild.members.cache.filter((member) => !member.user.bot).size}\nNo. of bots: ${guild.members.cache.filter((member) => member.user.bot).size}\nNo. of catagories: ${guild.channels.cache.filter((channel) => channel.type === ChannelType.GuildCategory).size}\nNo. of text-channels: ${guild.channels.cache.filter((channel) => channel.type === ChannelType.GuildText).size}\nNo. of voice-channels: ${guild.channels.cache.filter((channel) => channel.type === ChannelType.GuildVoice).size}\nNo. of forum-channels: ${guild.channels.cache.filter((channel) => channel.type === ChannelType.GuildForum).size}\nNo. of slash-commands: ${client.commands.size}\`\`\``,
						inline: false,
					},
				]);

			await botlogChannel.send({ embeds: [readyEmbed] });
		}
	}
}
