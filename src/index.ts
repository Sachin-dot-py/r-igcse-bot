import { GatewayIntentBits, Partials } from "discord.js";
import inquirer from "inquirer";
import mongo from "mongoose";
import actionRequired from "./cron/actionRequired";
import { redis } from "./redis";
import { DiscordClient } from "./registry/DiscordClient";
import {
	registerCommands,
	registerEvents,
	syncCommands,
} from "./registry/index";
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
		GatewayIntentBits.GuildScheduledEvents,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Message, Partials.Channel],
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

for (;;)
	await inquirer
		.prompt([
			{
				type: "input",
				name: "command",
				message: "$",
			},
		])
		.then((answers: { command: string }) => {
			const command = answers["command"];

			switch (command) {
				case "cron run actionRequired":
					actionRequired(client as DiscordClient<true>);
					break;
				case "refreshCommandData":
					syncCommands(client as DiscordClient<true>)
						.then(() =>
							Logger.info("Synced application commands globally"),
						)
						.catch(Logger.error);
					break;
				default:
					break;
			}
		});
