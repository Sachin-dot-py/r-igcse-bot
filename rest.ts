import { REST, Routes } from "discord.js";

const rest = new REST().setToken(process.env.BOT_TOKEN);

await rest.delete(
	Routes.applicationGuildCommand(
		"799603698631311441",
		"1214367926820544512",
		"1220827569893543977"
	)
);
