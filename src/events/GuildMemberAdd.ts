import { Events, GuildMember } from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import { GuildPreferencesCache } from "@/redis";

export default class GuildMemberAddEvent extends BaseEvent {
	constructor() {
		super(Events.GuildMemberAdd);
	}

	async execute(client: DiscordClient<true>, member: GuildMember) {
		if (member.user.bot) return;
		const guildPreferences = await GuildPreferencesCache.get(
			member.guild.id
		);
		if (
			!guildPreferences ||
			!guildPreferences.welcomeChannelMessage ||
			!guildPreferences.welcomeChannelId
		)
			return;

		const placeholdersMap = new Map<string, string>([
			["{user}", member.toString()],
			["{guildName}", member.guild.name],
			["{memberCount}", member.guild.memberCount.toString()]
		]);

		const welcomeChannelMessage =
			guildPreferences.welcomeChannelMessage.replace(
				/{\w+}/g,
				(match) => placeholdersMap.get(match) || match
			);

		if (guildPreferences.welcomeDMMessage) {
			const welcomeDMMessage =
				guildPreferences.welcomeDMMessage.replace(
					/{\w+}/g,
					(match) => placeholdersMap.get(match) || match
				) + `\n\n  \\- From **${member.guild.name}**`;

			await member.send({ content: welcomeDMMessage });
		}
		if (member.guild.id == process.env.MAIN_GUILD_ID && member.user.createdAt.getTime() >= (new Date().getTime() - 60 * 60 * 24 * 1000)) {
			await member.send({
				content: "We apologize for any inconvenience caused by our current policy. We use timeouts to prevent troublemakers, but we understand it's frustrating for new users like you. We're working on a better solution. Thank you for your patience."
			})
		}

		const welcomeChannel = await member.guild.channels.cache.get(
			guildPreferences.welcomeChannelId
		);

		if (!welcomeChannel || !welcomeChannel.isTextBased()) return;

		await welcomeChannel.send({
			content: welcomeChannelMessage
		});
	}
}
