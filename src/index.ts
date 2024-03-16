import "dotenv/config";

import { GatewayIntentBits } from "discord.js";
import { DiscordClient } from "./registry/DiscordClient";
import {
	registerCommands,
	registerEvents,
	registerMenus,
} from "./registry/index";
import { BOT_TOKEN } from "./constants";
import mongo from "mongoose";
import { redis } from "./redis";
import Logger from "./utils/Logger";

redis.on("error", Logger.error);

export const client = new DiscordClient({
	intents: [
		GatewayIntentBits.AutoModerationConfiguration,
		GatewayIntentBits.AutoModerationExecution,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessageTyping,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildEmojisAndStickers,
		GatewayIntentBits.GuildIntegrations,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildScheduledEvents,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
	],
});

await registerCommands(client);
await registerMenus(client);

await mongo.connect(process.env.MONGO_URL);

await client.login(BOT_TOKEN);

await registerEvents(client as DiscordClient<true>);
