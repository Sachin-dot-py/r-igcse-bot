import { registerCommands, registerEvents, syncCommands } from "@/registry";
import { Logger } from "@discordforge/logger";
import { GatewayIntentBits, Partials } from "discord.js";
import mongo from "mongoose";
import { redis } from "./redis";
import { DiscordClient } from "./registry/DiscordClient";

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
		GatewayIntentBits.GuildScheduledEvents,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
	allowedMentions: {
		parse: ["users", "roles"],
		repliedUser: true,
	},
});

await registerCommands(client);

await mongo.connect(process.env.MONGO_URL, {
	retryWrites: true,
	writeConcern: {
		w: "majority",
	},
	dbName: "r-igcse-bot",
});

await registerEvents(client);
await client.login(process.env.BOT_TOKEN);

process.on("uncaughtException", (error) => {
	Logger.error(`Uncaught Exception: ${error} | Stack: ${error.stack}`);
});

process.on("unhandledRejection", (error) => {
	Logger.error(
		`Unhandled Rejection: ${error} | Stack: ${error instanceof Error ? error.stack : "Unknown"}`,
	);
});
