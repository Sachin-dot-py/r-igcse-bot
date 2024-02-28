import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import {
	Colors,
	EmbedBuilder,
	type Guild,
	type GuildBasedChannel,
	type User,
} from "discord.js";

export default class Logger {
	constructor(private client: DiscordClient) {}

	public info(message: any) {
		console.log(`[ \x1b[0;34mi\x1b[0m ] ${message}`);
	}

	public warn(message: any) {
		console.log(`[ \x1b[0;33m!\x1b[0m ] ${message}`);
	}

	public error(message: any) {
		console.error(`[ \x1b[0;31mx\x1b[0m ] ${message}`);
	}

	public async ban(
		user: User,
		by: User,
		guild: Guild,
		reason: string,
		caseNumber: number,
		daysOfMessagesDeleted: number,
		modlogChannel: GuildBasedChannel,
	) {
		if (modlogChannel.isTextBased()) {
			const embed = new EmbedBuilder()
				.setTitle(`User Banned | Case #${caseNumber}`)
				.setDescription(reason)
				.setFooter({
					text: `${daysOfMessagesDeleted} days of messages deleted`,
				})
				.setColor(Colors.Red)
				.setAuthor({
					name: user.displayName,
					iconURL: user.displayAvatarURL(),
				})
				.addFields([
					{
						name: "User ID",
						value: user.id,
						inline: true,
					},
					{
						name: "Moderator",
						value: by.displayName,
						inline: true,
					},
				]);

			await modlogChannel.send({ embeds: [embed] });
		}
	}
}
