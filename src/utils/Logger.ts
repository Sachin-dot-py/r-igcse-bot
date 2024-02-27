import { GuildPreferences } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/client";
import { Colors, EmbedBuilder, type Guild, type User } from "discord.js";

export default class Logger {
	constructor(private client: DiscordClient) {}

	public info(message: string) {
		console.log(`[ \x1b[0;34mi\x1b[0m ] ${message}`);
	}

	public warn(message: string) {
		console.log(`[ \x1b[0;33m!\x1b[0m ] ${message}`);
	}

	public error(message: string) {
		console.error(`[ \x1b[0;31mx\x1b[0m ] ${message}`);
	}

	public async ban(
		user: User,
		by: User,
		guild: Guild,
		reason: string,
		caseNumber: number,
		daysOfMessagesDeleted: number,
	) {
		const modlogChannelId = (await GuildPreferencesCache.get(guild.id))
			?.modlogChannelId;

		if (!modlogChannelId) return;

		const modlogChannel = guild.channels.cache.get(modlogChannelId);

		if (modlogChannel && modlogChannel.isTextBased()) {
			// const embed = new EmbedBuilder()
			// 	.setTitle("User Banned")
			// 	.setDescription(reason)
			// 	.setFooter({
			// 		text: `${daysOfMessagesDeleted} days of messages deleted`,
			// 	})
			// 	.setColor(Colors.Red)
			// 	.setAuthor({
			// 		name: user.displayName,
			// 		iconURL: user.displayAvatarURL(),
			// 	});

			await modlogChannel.send({
				content: `Case #${caseNumber} | [Ban]\nUsername: ${user.displayName} (${user.id})\nModerator: ${by.displayName} \nReason: ${reason}`,
			});
		}
	}
}
