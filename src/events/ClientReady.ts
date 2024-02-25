import {
	AL_HELPER_ROLE,
	BETA,
	BOTLOG_CHANNEL_ID,
	BOT_DEVELOPER_ROLE,
	CHAT_MODERATOR_ROLE,
	GUILD_ID,
	IGCSE_HELPER_ROLE,
	MODERATOR_ROLE,
	TEMP_MODERATOR_ROLE,
} from "@/constants";
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

		await syncInteractions(client);

		const guild = client.guilds.cache.get(GUILD_ID);
		const botlogChannel = await guild?.channels.cache.get(BOTLOG_CHANNEL_ID);

		if (!guild || !botlogChannel || !botlogChannel.isTextBased()) return;

		const { format: timeFormatter } = new Intl.DateTimeFormat("en-GB", {
			year: "numeric",
			month: "numeric",
			day: "numeric",
		});

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
					value: `\`\`\`Name: ${guild.name}\nOwner: dawood\nCreated on: ${timeFormatter(guild.createdAt)}\nMembers: ${guild.memberCount}\nBoosts: ${guild.premiumSubscriptionCount}\nID: ${guild.id}\`\`\``,
					inline: false,
				},
				{
					name: "Role Statistics",
					value: `\`\`\`No. of roles: ${guild.roles.cache.size}\nNo. of members: ${guild.memberCount}\nIGCSE Helpers: ${guild.roles.cache.get(IGCSE_HELPER_ROLE)!.members.size}\nAS/AL Helpers: ${guild.roles.cache.get(AL_HELPER_ROLE)!.members.size}\nBot Developers: ${guild.roles.cache.get(BOT_DEVELOPER_ROLE)!.members.size}\nStaff Moderators: ${guild.roles.cache.get(MODERATOR_ROLE)!.members.size}\nTemp Moderators: ${guild.roles.cache.get(TEMP_MODERATOR_ROLE)!.members.size}\nChat Moderators: ${guild.roles.cache.get(CHAT_MODERATOR_ROLE)!.members.size}\`\`\``,
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
