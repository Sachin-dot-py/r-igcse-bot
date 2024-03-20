import type PracticeCommand from "@/commands/study/Practice";
import { StickyMessage } from "@/mongo";
import { Keyword } from "@/mongo/schemas/Keyword";
import { KeywordCache, StickyMessageCache } from "@/redis";
import { syncInteractions } from "@/registry";
import Logger from "@/utils/Logger";
import {
	ActivityType,
	ChannelType,
	Colors,
	EmbedBuilder,
	Events
} from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import type GoStudyCommand from "@/commands/miscellaneous/GoStudy";

export default class ClientReadyEvent extends BaseEvent {
	constructor() {
		super(Events.ClientReady);
	}

	async execute(client: DiscordClient<true>) {
		if (!client.user) return;

		Logger.info(`Logged in as \x1b[1m${client.user.tag}\x1b[0m`);

		client.user.setPresence({
			activities: [{ type: ActivityType.Watching, name: "r/IGCSE" }],
			status: "online"
		});

		const { format: timeFormatter } = new Intl.DateTimeFormat("en-GB", {
			year: "numeric",
			month: "numeric",
			day: "numeric"
		});

		const mainGuild = client.guilds.cache.get(process.env.MAIN_GUILD_ID);
		if (mainGuild) {
			const readyEmbed = new EmbedBuilder()
				.setTitle(`${client.user.displayName} restarted successfully!`)
				.setColor(Colors.Green)
				.setAuthor({
					name: client.user.displayName,
					iconURL: client.user.displayAvatarURL()
				})
				.addFields([
					{
						name: "Bot Information",
						value: `\`\`\`Name: ${client.user.displayName}\nCreated on: ${timeFormatter(client.user.createdAt)}\nJoined on: ${timeFormatter(mainGuild.joinedAt)}\nVerified: ${client.user.flags?.has("VerifiedBot")}\nNo. of guilds: ${client.guilds.cache.size}\nID: ${client.user.id}\`\`\``,
						inline: false
					},
					{
						name: "Guild Information",
						value: `\`\`\`Name: ${mainGuild.name}
Owner: ${(await mainGuild.fetchOwner()).displayName}
Created on: ${timeFormatter(mainGuild.createdAt)}
Members: ${mainGuild.memberCount}
Boosts: ${mainGuild.premiumSubscriptionCount}
ID: ${mainGuild.id}\`\`\``,
						inline: false
					},
					{
						name: "Role Statistics",
						value: `\`\`\`No. of roles: ${mainGuild.roles.cache.size}
No. of members: ${mainGuild.memberCount}
Helpers: // TODO
Moderators: // TODO\`\`\``,
						inline: false
					},
					{
						name: "Channels & Commands",
						value: `\`\`\`No. of users: ${mainGuild.members.cache.filter((member) => !member.user.bot).size}
No. of bots: ${mainGuild.members.cache.filter((member) => member.user.bot).size}
No. of catagories: ${mainGuild.channels.cache.filter((channel) => channel.type === ChannelType.GuildCategory).size}
No. of text-channels: ${mainGuild.channels.cache.filter((channel) => channel.type === ChannelType.GuildText).size}
No. of voice-channels: ${mainGuild.channels.cache.filter((channel) => channel.type === ChannelType.GuildVoice).size}
No. of forum-channels: ${mainGuild.channels.cache.filter((channel) => channel.type === ChannelType.GuildForum).size}
No. of slash-commands: ${client.commands.size}\`\`\``,
						inline: false
					}
				]);

			await Logger.channel(mainGuild, process.env.ERROR_LOGS_CHANNEL_ID, {
				embeds: [readyEmbed]
			});
		}

		const practiceCommand = client.commands.get("practice") as
			| PracticeCommand
			| undefined;

		if (practiceCommand) {
			Logger.info("Starting practice questions loop");
			setInterval(() => practiceCommand.sendQuestions(client), 3500);
		}

		const goStudyCommand = client.commands.get("gostudy") as
			| GoStudyCommand
			| undefined;

		if (goStudyCommand) {
			Logger.info("Starting go study loop");
			setInterval(() => goStudyCommand.expireForcedMute(client), 60000);
		}

		await syncInteractions(client, "1214367926820544512")
			.then(() => Logger.info("Synced application commands globally"))
			.catch(Logger.error);

		await this.loadKeywordsCache()
			.then(() => Logger.info("Populated Keywords Cache"))
			.catch(Logger.error);

		setInterval(
			async () =>
				await this.refreshStickyMessagesCache().catch(Logger.error),
			60000
		);
	}

	private async loadKeywordsCache() {
		const keywords = await Keyword.find().exec();

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const { _id, ...rest } of keywords.map((keyword) =>
			keyword.toObject()
		))
			KeywordCache.append(rest);
	}

	private async refreshStickyMessagesCache() {
		const time = Date.now();

		const stickyMessages = await StickyMessage.find().exec();

		for (const stickyMessage of stickyMessages) {
			const stickTime = parseInt(stickyMessage.stickTime);
			const unstickTime = parseInt(stickyMessage.unstickTime);

			if (stickTime <= time && unstickTime >= time)
				await StickyMessageCache.set(stickyMessage.id, {
					channelId: stickyMessage.channelId,
					messageId: stickyMessage.messageId,
					embeds: stickyMessage.embeds
				});
			else if (unstickTime <= time) {
				await StickyMessage.deleteOne({
					messageId: stickyMessage.messageId
				}).exec();

				await StickyMessageCache.remove(stickyMessage.id);
			}
		}
	}
}
