import type GoStudyCommand from "@/commands/miscellaneous/GoStudy";
import type HostSessionCommand from "@/commands/study/HostSession";
import type PracticeCommand from "@/commands/study/Practice";
import { StickyMessage } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import { ChannelLockdown } from "@/mongo/schemas/ChannelLockdown";
import { Keyword } from "@/mongo/schemas/Keyword";
import { ScheduledMessage } from "@/mongo/schemas/ScheduledMessage";
import { KeywordCache, StickyMessageCache } from "@/redis";
import type {
	APIEmbedRedis,
	MessageCreateOptionsRedis,
} from "@/redis/schemas/StickyMessage";
import { logToChannel } from "@/utils/Logger";
import createTask from "@/utils/createTask";
import { Logger } from "@discordforge/logger";
import {
	ActivityType,
	Colors,
	EmbedBuilder,
	Events,
	ForumChannel,
	GuildChannel,
	TextChannel,
	ThreadChannel,
	ChannelType,
} from "discord.js";
import { EntityId } from "redis-om";
import { client } from "..";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";

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
				.setTitle("Restarted successfully!")
				.setColor(Colors.Green)
				.setAuthor({
					name: client.user.tag,
					iconURL: client.user.displayAvatarURL(),
				})
				.setTimestamp();

			await logToChannel(mainGuild, process.env.ERROR_LOGS_CHANNEL_ID, {
				embeds: [readyEmbed],
			});
		}

		const practiceCommand = client.commands.get("practice") as
			| PracticeCommand
			| undefined;

		if (practiceCommand) {
			Logger.info("Starting practice questions loop");
			createTask(
				() =>
					practiceCommand
						.sendQuestions(client)
						.catch((e) =>
							Logger.error(
								`Error at practiceCommand.sendQuestions: ${e}`,
							),
						),
				3500,
			);
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

		Logger.info("Starting channel lockdowns refresh loop");
		createTask(
			async () =>
				await this.refreshChannelLockdowns().catch((e) =>
					Logger.error(`Error at refreshChannelLockdowns: ${e}`),
				),
			20000,
		);
	}

	private async loadKeywordsCache() {
		for (const id of await KeywordCache.search()
			.returnAllIds()
			.catch(() => [])) {
			KeywordCache.remove(id);
		}

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
		const now = Math.floor(Date.now() / 1000);

		const toLock = await ChannelLockdown.find({
			locked: false,
			startTimestamp: { $lte: now.toString() },
			endTimestamp: { $gt: now.toString() },
		});

		for (const lockdown of toLock) {
			const guild = await client.guilds.fetch(lockdown.guildId).catch(() => null);
			if (!guild) continue;
			const channel = await guild.channels.fetch(lockdown.channelId).catch(() => null);
			if (!channel) {
				await lockdown.deleteOne();
				continue;
			}

			if (
				channel.type === ChannelType.GuildText ||
				channel.type === ChannelType.GuildForum
			) {
				await channel.permissionOverwrites.edit(
					guild.roles.everyone.id,
					{
						SendMessages: false,
						SendMessagesInThreads: false,
						CreatePrivateThreads: false,
						CreatePublicThreads: false,
					}
				);

				const guildPreferences = await GuildPreferencesCache.get(guild.id);
				const modRoleId = guildPreferences?.moderatorRoleId;

				if (modRoleId && guild.roles.cache.has(modRoleId)) {
					const modRole = guild.roles.cache.get(modRoleId);
					await channel.permissionOverwrites.edit(
						modRole!.id,
						{
							SendMessages: true,
							SendMessagesInThreads: true,
							CreatePrivateThreads: true,
							CreatePublicThreads: true,
						}
					);
				}

				if (channel.type === ChannelType.GuildText) {
					await channel.send(
						"https://raw.githubusercontent.com/Juzcallmekaushik/r-igcse-bot/refs/heads/assets/r-igcse_locked_banner_gif_1_1.gif",
					);
				}
			} else if (
				channel.type === ChannelType.PublicThread ||
				channel.type === ChannelType.PrivateThread
			) {
				if (!channel.locked) {
					await channel.setLocked(true);
					await channel.send(
						"https://raw.githubusercontent.com/Juzcallmekaushik/r-igcse-bot/refs/heads/assets/r-igcse_locked_banner_gif_1_1.gif",
					);
				}
			}

			await ChannelLockdown.updateOne(
				{ _id: lockdown._id },
				{ $set: { locked: true } },
			);
		}

		const toUnlock = await ChannelLockdown.find({
			locked: true,
			endTimestamp: { $lte: now.toString() },
		});

		for (const lockdown of toUnlock) {
			const guild = await client.guilds.fetch(lockdown.guildId).catch(() => null);
			if (!guild) continue;
			const channel = await guild.channels.fetch(lockdown.channelId).catch(() => null);
			if (!channel) {
				await lockdown.deleteOne();
				continue;
			}

			if (
				channel.type === ChannelType.GuildText ||
				channel.type === ChannelType.GuildForum
			) {
				await channel.permissionOverwrites.edit(
					guild.roles.everyone,
					{
						SendMessages: null,
						SendMessagesInThreads: null,
						CreatePrivateThreads: null,
						CreatePublicThreads: null,
					},
				);
			} else if (
				channel.type === ChannelType.PublicThread ||
				channel.type === ChannelType.PrivateThread
			) {
				if (channel.locked) {
					await channel.setLocked(false);
				}
			}

			if (channel.isTextBased && channel.isTextBased()) {
				const unlockEmbed = new EmbedBuilder()
					.setTitle("Channel Unlocked!")
					.setDescription(
						[
							"Paper discussions are only allowed in the designated channels. Early discussion before all variants are completed is **strictly prohibited** and may result in a timeout.",
							"",
							"To access **M/J 2025** discussion channels, please visit <#1357402364629356544> and obtain the verified role."
						].join("\n")
					)
					.setColor(Colors.Green)
					.setTimestamp();

				await channel.send({ embeds: [unlockEmbed] });
			}
			await lockdown.deleteOne();
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