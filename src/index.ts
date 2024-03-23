import "dotenv/config";

import { GatewayIntentBits, Partials } from "discord.js";
import mongo from "mongoose";
import { redis } from "./redis";
import { DiscordClient } from "./registry/DiscordClient";
import {
	registerCommands,
	registerEvents,
	syncCommands
} from "./registry/index";
import Logger from "./utils/Logger";
import actionRequired from "./cron/actionRequired";
import inquirer from "inquirer";

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
		GatewayIntentBits.MessageContent
	],
	partials: [Partials.Message, Partials.Channel],
	allowedMentions: {
		parse: ["users", "roles"],
		repliedUser: true
	}
});

await registerCommands(client);

await mongo.connect(process.env.MONGO_URL, {
	retryWrites: true,
	writeConcern: {
		w: "majority"
	},
	dbName: "r-igcse-bot"
});

await client.login(process.env.BOT_TOKEN);

await registerEvents(client as DiscordClient<true>);

for (;;)
	await inquirer
		.prompt([
			{
				type: "input",
				name: "command",
				message: "$"
			}
		])
		.then((answers: { command: string }) => {
			const command = answers["command"];

			switch (command) {
				case "cron run actionRequired":
					actionRequired(client as DiscordClient<true>);
					break;
				case "refreshCommandData":
					syncCommands(client)
						.then(() =>
							Logger.info("Synced application commands globally")
						)
						.catch(Logger.error);
					console.log("test");
					break;
				default:
					break;
			}
		});
