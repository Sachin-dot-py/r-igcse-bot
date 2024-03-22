import { PrivateDmThread } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import {
	ChannelType,
	GuildMember,
	MessagePayload,
	TextChannel,
	ThreadChannel,
	type MessageCreateOptions
} from "discord.js";
import Logger from "./Logger";

const sendDm = async (
	member: GuildMember,
	message: string | MessagePayload | MessageCreateOptions
): Promise<void> => {
	try {
		await member.send(message);
	} catch (error) {
		const guildPreferences = await GuildPreferencesCache.get(
			member.guild.id
		);
		if (!guildPreferences || !guildPreferences.closedDmChannelId) return;

		const channel = member.guild.channels.cache.get(
			guildPreferences.closedDmChannelId
		);
		if (!channel || !(channel instanceof TextChannel)) return;

		let thread: ThreadChannel | undefined;

		const dmThread =
			(await PrivateDmThread.findOne({
				userId: member.id,
				guildId: member.guild.id
			})) ?? null;
		if (!dmThread) {
			await channel.permissionOverwrites.create(member.id, {
				ViewChannel: true,
				SendMessages: false,
				CreatePublicThreads: false,
				CreatePrivateThreads: false
			});
			const newThread = await channel.threads.create({
				name: `${member.user.username} (${member.id})`,
				type: ChannelType.PrivateThread
			});

			await newThread.members
				.add(member, "User has DMs closed")
				.catch(() => {}); // user has blocked the bot most likely

			thread = newThread;

			await PrivateDmThread.create({
				userId: member.id,
				threadId: newThread.id,
				guildId: member.guild.id
			});
		} else {
			thread = channel.threads.cache.get(dmThread.threadId);
		}

		if (!thread) {
			Logger.error(
				`Thread not found for user ${member.id} in guild ${member.guild.id}`
			);
			return;
		}

		await thread.send(`<@${member.id}>`);
		await thread.send(message);
	}
};

export default sendDm;
