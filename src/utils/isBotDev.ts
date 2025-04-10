import type { DiscordClient } from "@/registry/DiscordClient";

export const isBotDev = async (client: DiscordClient<true>, userId: string) => {
	const guild = await client.guilds.fetch(process.env.MAIN_GUILD_ID);

	if (!guild) {
		return false;
	}

	const member = await guild.members.fetch(userId);

	if (!member) {
		return false;
	}

	return member.roles.cache.has(process.env.BOT_DEV_ROLE_ID);
};
