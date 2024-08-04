import { ClosedDmThread } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import { Logger } from "@discordforge/logger";
import {
	ChannelType,
	type GuildMember,
	type MessageCreateOptions,
	type MessagePayload,
	TextChannel,
	type ThreadChannel,
} from "discord.js";

const sendDm = async (
	member: GuildMember,
	message: string | MessagePayload | MessageCreateOptions,
): Promise<void> => {
	try {
		await member.send(message);
	} catch (error) {
		const guildPreferences = await GuildPreferencesCache.get(
			member.guild.id,
		);
		if (!guildPreferences || !guildPreferences.closedDmChannelId) return;

		const channel = member.guild.channels.cache.get(
			guildPreferences.closedDmChannelId,
		);
		if (!channel || !(channel instanceof TextChannel)) return;

		let thread: ThreadChannel | undefined;

		const dmThread =
			(await ClosedDmThread.findOne({
				userId: member.id,
				guildId: member.guild.id,
			})) ?? null;
		if (dmThread) {
			thread = channel.threads.cache.get(dmThread.threadId);
		} else {
			await channel.permissionOverwrites.create(member.id, {
				ViewChannel: true,
				SendMessages: false,
				CreatePublicThreads: false,
				CreatePrivateThreads: false,
			});
			const newThread = await channel.threads.create({
				name: `${member.user.username} (${member.id})`,
				type: ChannelType.PrivateThread,
			});

			await newThread.members
				.add(member, "User has DMs closed")
				.catch(() => {}); // user has blocked the bot most likely

			thread = newThread;

			await ClosedDmThread.create({
				userId: member.id,
				threadId: newThread.id,
				guildId: member.guild.id,
			});
		}

		if (!thread) {
			Logger.error(
				`Thread not found for user ${member.id} in guild ${member.guild.id}`,
			);
			return;
		}

		await thread.send(`<@${member.id}>`);
		await thread.send(message);
	}
};

export default sendDm;
