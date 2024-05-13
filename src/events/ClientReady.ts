import type GoStudyCommand from "@/commands/miscellaneous/GoStudy";
import type PracticeCommand from "@/commands/study/Practice";
import { StickyMessage } from "@/mongo";
import { ChannelLockdown } from "@/mongo/schemas/ChannelLockdown";
import { Keyword } from "@/mongo/schemas/Keyword";
import { KeywordCache, StickyMessageCache } from "@/redis";
import type { APIEmbedRedis } from "@/redis/schemas/StickyMessage";
import Logger from "@/utils/Logger";
import createTask from "@/utils/createTask";
import {
	ActivityType,
	Colors,
	EmbedBuilder,
	Events,
	ForumChannel,
	TextChannel,
	ThreadChannel
} from "discord.js";
import { client } from "..";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import { EntityId } from "redis-om";
import { ScheduledMessage } from "@/mongo/schemas/ScheduledMessage";

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

		const mainGuild = client.guilds.cache.get(process.env.MAIN_GUILD_ID);
		if (mainGuild) {
			const readyEmbed = new EmbedBuilder()
				.setTitle(`Restarted successfully!`)
				.setColor(Colors.Green)
				.setAuthor({
					name: client.user.tag,
					iconURL: client.user.displayAvatarURL()
				})
				.setTimestamp();

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

		await this.loadKeywordsCache().catch(Logger.error);

		Logger.info("Starting scheduled messages loop");
		createTask(() => this.sendScheduledMessage(client).catch(Logger.error), 60000);

		createTask(
			async () =>
				await this.refreshStickyMessageCache().catch(Logger.error),
			60000
		);

		createTask(
			async () =>
				await this.refreshChannelLockdowns().catch(Logger.error),
			120000
		);
	}

	private async loadKeywordsCache() {
		(await KeywordCache.search().returnAllIds()).forEach((id) =>
			KeywordCache.remove(id)
		);

		const keywords = await Keyword.find();

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const { _id, ...rest } of keywords.map((keyword) =>
			keyword.toObject()
		))
			KeywordCache.append(rest);
	}

	private async refreshStickyMessageCache() {
		const time = Date.now();

		const stickyMessages = await StickyMessage.find();
		const cachedStickyMessages = await StickyMessageCache.getAll();

		for (const stickyMessage of stickyMessages) {
			const stickTime = parseInt(stickyMessage.stickTime || "");
			const unstickTime = parseInt(stickyMessage.unstickTime || "");
			const cachedSticky = cachedStickyMessages.find(
				(x) => x[EntityId] === stickyMessage.id
			);

			if (cachedSticky) await StickyMessageCache.remove(stickyMessage.id);

			if (Number.isNaN(stickTime) || Number.isNaN(unstickTime)) {
				await StickyMessageCache.set(stickyMessage.id, {
					channelId: stickyMessage.channelId,
					messageId: cachedSticky
						? cachedSticky.messageId
						: stickyMessage.messageId,
					embeds: stickyMessage.embeds as APIEmbedRedis[]
				});
				if (!client.stickyChannelIds.includes(stickyMessage.channelId))
					client.stickyChannelIds.push(stickyMessage.channelId);
				continue;
			}

			if (stickTime <= time && unstickTime >= time)
				await StickyMessageCache.set(stickyMessage.id, {
					channelId: stickyMessage.channelId,
					messageId: cachedSticky
						? cachedSticky.messageId
						: stickyMessage.messageId,
					embeds: stickyMessage.embeds as APIEmbedRedis[]
				});
			if (!client.stickyChannelIds.includes(stickyMessage.channelId))
				client.stickyChannelIds.push(stickyMessage.channelId);
			else if (unstickTime <= time) {
				await stickyMessage.deleteOne();
				await StickyMessageCache.remove(stickyMessage.id);
			}
		}
	}

	private async refreshChannelLockdowns() {
		const time = Date.now() / 1000;

		for (const lockdown of await ChannelLockdown.find()) {
			const startTime = parseInt(lockdown.startTimestamp);
			const endTime = parseInt(lockdown.endTimestamp);

			if (startTime > time) continue;

			const locked = time <= endTime;

			const channel = await client.channels.fetch(lockdown.channelId);

			if (channel instanceof ThreadChannel) channel.setLocked(locked);
			else if (
				channel instanceof TextChannel ||
				channel instanceof ForumChannel
			)
				channel.permissionOverwrites.edit(
					channel.guild.roles.everyone,
					{
						SendMessages: !locked,
						SendMessagesInThreads: !locked
					}
				);

			if (endTime <= time)
				ChannelLockdown.deleteOne({
					channelId: lockdown.channelId
				});
		}
	}

	private async sendScheduledMessage(client: DiscordClient) {

		const scheduledMessages = await ScheduledMessage.find({
			$expr: {
				$lte: [
					{ $toLong: "$scheduleTime" },
					{ $divide: [Date.now(), 1000] }
				]
			}
		});

		for (let scheduledMessage of scheduledMessages) {
			const messageGuild = client.guilds.cache.get(scheduledMessage.guildId);

			const messageChannel = messageGuild?.channels.cache.get(scheduledMessage.channelId);

			if (!messageChannel || !messageChannel.isTextBased()) return;

			await messageChannel.send(scheduledMessage.message);

			await scheduledMessage.deleteOne();
		}

	}
}
