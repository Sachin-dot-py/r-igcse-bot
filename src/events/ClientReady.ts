import { GuildPreferences, StickyMessage } from "@/mongo";
import { syncInteractions } from "@/registry";
import {
	ActivityType,
	ChannelType,
	Colors,
	EmbedBuilder,
	Events,
} from "discord.js";
import { logger } from "..";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import { GuildPreferencesCache, StickyMessageCache } from "@/redis";
import type PracticeCommand from "@/commands/study/Practice";

export default class ClientReadyEvent extends BaseEvent {
	constructor() {
		super(Events.ClientReady);
	}

	async execute(client: DiscordClient<true>) {
		if (!client.user) return;

		logger.info(`Logged in as \x1b[1m${client.user.tag}\x1b[0m`);

		client.user.setPresence({
			activities: [{ type: ActivityType.Watching, name: "r/IGCSE" }],
			status: "online",
		});

		const { format: timeFormatter } = new Intl.DateTimeFormat("en-GB", {
			year: "numeric",
			month: "numeric",
			day: "numeric",
		});

		for (const guild of client.guilds.cache.values()) {
			const guildPrefs = await GuildPreferencesCache.get(guild.id);

			if (!guildPrefs.botlogChannelId) continue;

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
						value: `\`\`\`Name: ${client.user.displayName}\nCreated on: ${timeFormatter(client.user.createdAt)}\nJoined on: ${timeFormatter(guild.joinedAt)}\nVerified: ${client.user.flags?.has("VerifiedBot")}\nNo. of guilds: ${client.guilds.cache.size}\nID: ${client.user.id}\`\`\``,
						inline: false,
					},
					{
						name: "Guild Information",
						value: `\`\`\`Name: ${guild.name}\nOwner: ${(await guild.fetchOwner()).displayName}}\nCreated on: ${timeFormatter(guild.createdAt)}\nMembers: ${guild.memberCount}\nBoosts: ${guild.premiumSubscriptionCount}\nID: ${guild.id}\`\`\``,
						inline: false,
					},
					{
						name: "Role Statistics",
						value: `\`\`\`No. of roles: ${guild.roles.cache.size}\nNo. of members: ${guild.memberCount}\nHelpers: // TODO\nModerators: // TODO\`\`\``,
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

		await this.populateGuildPreferencesCache()
			.then(() => logger.info("Populated Guild Preferences Cache"))
			.catch(logger.error);

		// await this.populateStickyMessageCache(client)
		// 	.then(() => logger.info("Populated Sticky Messages Cache"))
		// 	.catch(logger.error);

		const practiceCommand = client.commands.get("practice") as PracticeCommand | undefined;
		if (practiceCommand) {
			setInterval(practiceCommand.sendQuestions(client), 3500);
		}
	}

	private async populateGuildPreferencesCache() {
		const guildPreferencess = await GuildPreferences.find().exec();

		for (const guildPreferences of guildPreferencess) {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { _id, guildId, ...data } = guildPreferences.toObject();

			await GuildPreferencesCache.set(guildId, data);
		}
	}

	private async updateStickyMessagesCache() {
		const time = Date.now();

		const stickyMessages = await StickyMessage.find().exec();

		for (const stickyMessage of stickyMessages) {
			const stickTime = parseInt(stickyMessage.stickTime);
			const unstickTime = parseInt(stickyMessage.unstickTime);

			if (stickTime <= time && unstickTime >= time)
				await StickyMessageCache.set(stickyMessage.id, {
					channelId: stickyMessage.channelId,
					messageId: stickyMessage.messageId,
					embeds: stickyMessage.embeds,
				});
			else if (unstickTime <= time) {
				await StickyMessage.deleteOne({
					messageId: stickyMessage.messageId,
				}).exec();

				await StickyMessageCache.remove(stickyMessage.id);
			}
		}
	}
}
