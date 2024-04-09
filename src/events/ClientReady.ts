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
	CategoryChannel,
	Colors,
	EmbedBuilder,
	Events,
	ForumChannel,
	TextChannel,
	ThreadChannel,
	VoiceChannel
} from "discord.js";
import { client } from "..";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import { EntityId } from "redis-om";

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
			const channelCount = {
				category: 0,
				text: 0,
				voice: 0,
				forum: 0
			};

			for (const channel of mainGuild.channels.cache.values())
				if (channel instanceof TextChannel) channelCount.text++;
				else if (channel instanceof CategoryChannel)
					channelCount.category++;
				else if (channel instanceof VoiceChannel) channelCount.voice++;
				else if (channel instanceof ForumChannel) channelCount.forum++;

			const readyEmbed = new EmbedBuilder()
				.setTitle(`Restarted successfully!`)
				.setColor(Colors.Green)
				.setAuthor({
					name: client.user.tag,
					iconURL: client.user.displayAvatarURL()
				}).setTimestamp()

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

		const lockdownData = await ChannelLockdown.find();

		for (const lockdown of lockdownData) {
			const startTime = parseInt(lockdown.startTimestamp);
			const endTime = parseInt(lockdown.endTimestamp);

			if (endTime <= time) {
				await ChannelLockdown.deleteOne({
					channelId: lockdown.channelId
				});

				continue;
			}

			const locked = startTime >= time ? false : true;

			const channel = client.channels.cache.get(lockdown.channelId);

			if (channel instanceof ThreadChannel && !channel.locked)
				await channel.setLocked(locked);
			else if (
				channel instanceof TextChannel ||
				channel instanceof ForumChannel
			)
				await channel.permissionOverwrites.edit(
					channel.guild.roles.everyone,
					{
						SendMessages: !locked,
						SendMessagesInThreads: !locked
					}
				);
		}
	}
}
