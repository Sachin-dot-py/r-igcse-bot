import type GoStudyCommand from "@/commands/miscellaneous/GoStudy";
import type HostSessionCommand from "@/commands/study/HostSession";
import { StickyMessage } from "@/mongo";
import { ChannelLockdown } from "@/mongo/schemas/ChannelLockdown";
import { Keyword } from "@/mongo/schemas/Keyword";
import { ScheduledMessage } from "@/mongo/schemas/ScheduledMessage";
import { KeywordCache, StickyMessageCache } from "@/redis";
import type {
	APIEmbedRedis,
	MessageCreateOptionsRedis,
} from "@/redis/schemas/StickyMessage";
import createTask from "@/utils/createTask";
import {
	ActivityType,
	Colors,
	EmbedBuilder,
	Events,
	ForumChannel,
	TextChannel,
	ThreadChannel,
} from "discord.js";
import { EntityId } from "redis-om";
import { client } from "..";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import { Logger } from "@discordforge/logger";
import { logToChannel } from "@/utils/Logger";

export default class ClientReadyEvent extends BaseEvent {
	constructor() {
		super(Events.ClientReady);
	}

	async execute(client: DiscordClient<true>) {
		if (!client.user) return;

		Logger.info(`Logged in as \x1b[1m${client.user.tag}\x1b[0m`);

		client.user.setPresence({
			activities: [{ type: ActivityType.Watching, name: "r/IGCSE" }],
			status: "online",
		});

		const mainGuild = client.guilds.cache.get(process.env.MAIN_GUILD_ID);
		if (mainGuild) {
			const readyEmbed = new EmbedBuilder()
				.setTitle(`Restarted successfully!`)
				.setColor(Colors.Green)
				.setAuthor({
					name: client.user.tag,
					iconURL: client.user.displayAvatarURL(),
				})
				.setTimestamp();

			await logToChannel(mainGuild, process.env.ERROR_LOGS_CHANNEL_ID, {
				embeds: [readyEmbed],
			});
			createTask(async ()=>{
				const channel = await mainGuild.channels.fetch(process.env.RESULT_REMINDER_CHANNEL_ID)
				if(channel && channel.isTextBased()) {
					const today = new Date();
					const targetDate = new Date(2024, 7, 13, 5, 0, 0);
					const diffInMs = targetDate.getTime() - today.getTime();
					const hoursLeft = Math.floor(diffInMs / (1000 * 60 * 60));
					const daysLeft = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
					const embed = new EmbedBuilder()
						.setColor(Colors.Blurple)
						.setTitle('Time till result day!')
						.setDescription(
							`Result day <t:1723525200:R>\n\nThere are exactly **${daysLeft}** days left till result day.\nThere are exactly **${hoursLeft}** hours left till result time.`
						)
					channel.send({embeds: [embed]})
				}
			}, 3600000)
		}

		const goStudyCommand = client.commands.get("gostudy") as
			| GoStudyCommand
			| undefined;

		if (goStudyCommand) {
			Logger.info("Starting go study loop");
			createTask(
				() =>
					goStudyCommand
						.expireForcedMute(client)
						.catch((e) =>
							Logger.error(
								`Error at goStudyCommand.expireForcedMute: ${e}`,
							),
						),
				60000,
			);
		}

		await this.loadKeywordsCache().catch((e) =>
			Logger.error(`Error at loadKeywordsCache: ${e}`),
		);

		Logger.info("Starting scheduled messages loop");
		createTask(
			() =>
				this.sendScheduledMessage(client).catch((e) =>
					Logger.error(`Error at sendScheduledMessage: ${e}`),
				),
			60000,
		);

		const hostSessionCommand = client.commands.get("host_session") as
			| HostSessionCommand
			| undefined;

		if (hostSessionCommand) {
			Logger.info("Starting hosted sessions loop");
			setInterval(() => hostSessionCommand.startSession(client), 60_000);
		}

		createTask(
			async () =>
				await this.refreshStickyMessageCache().catch((e) =>
					Logger.error(`Error at refreshStickyMessageCache: ${e}`),
				),
			60000,
		);

		createTask(
			async () =>
				await this.refreshChannelLockdowns().catch((e) =>
					Logger.error(`Error at sendScheduledMessage: ${e}`),
				),
			120000,
		);
	}

	private async loadKeywordsCache() {
		(
			await KeywordCache.search()
				.returnAllIds()
				.catch(() => [])
		).forEach((id) => KeywordCache.remove(id));

		const keywords = await Keyword.find();

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const { _id, ...rest } of keywords.map((keyword) =>
			keyword.toObject(),
		))
			KeywordCache.append(rest);
	}

	private async refreshStickyMessageCache() {
		const time = Date.now();

		const stickyMessages = await StickyMessage.find();
		const cachedStickyMessages = await StickyMessageCache.getAll().catch(
			() => [],
		);

		for (const stickyMessage of stickyMessages) {
			const stickTime = Number.parseInt(stickyMessage.stickTime || "");
			const unstickTime = Number.parseInt(
				stickyMessage.unstickTime || "",
			);
			const cachedSticky = cachedStickyMessages.find(
				(x) => x[EntityId] === stickyMessage.id,
			);

			if (cachedSticky) await StickyMessageCache.remove(stickyMessage.id);

			if (Number.isNaN(stickTime) || Number.isNaN(unstickTime)) {
				await StickyMessageCache.set(stickyMessage.id, {
					channelId: stickyMessage.channelId,
					messageId: cachedSticky
						? cachedSticky.messageId
						: stickyMessage.messageId,
					message: stickyMessage.message as MessageCreateOptionsRedis,
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
					message: {
						content: stickyMessage.message.content,
						embeds: stickyMessage.message.embeds as APIEmbedRedis[],
					},
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
			const startTime = Number.parseInt(lockdown.startTimestamp);
			const endTime = Number.parseInt(lockdown.endTimestamp);

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
						SendMessagesInThreads: !locked,
					},
				);

			if (endTime <= time)
				ChannelLockdown.deleteOne({
					channelId: lockdown.channelId,
				});
		}
	}

	private async sendScheduledMessage(client: DiscordClient) {
		const scheduledMessages = await ScheduledMessage.find({
			$expr: {
				$lte: [
					{ $toLong: "$scheduleTime" },
					{ $divide: [Date.now(), 1000] },
				],
			},
		});

		for (const scheduledMessage of scheduledMessages) {
			const messageGuild = client.guilds.cache.get(
				scheduledMessage.guildId,
			);

			const messageChannel = messageGuild?.channels.cache.get(
				scheduledMessage.channelId,
			);

			if (!messageChannel || !messageChannel.isTextBased()) return;

			await messageChannel.send(scheduledMessage.message);

			await scheduledMessage.deleteOne();
		}
	}
}
