import { GuildPreferences, Punishment, type IGuildPreferences } from "@/mongo";
import { DiscordClient } from "@/registry/DiscordClient";
import {
	Colors,
	EmbedBuilder,
	GatewayIntentBits,
	Partials,
	type APIEmbedField
} from "discord.js";
import mongo from "mongoose";

const client = new DiscordClient({
	intents: [GatewayIntentBits.Guilds],
	partials: [Partials.Message, Partials.Channel]
});

await mongo.connect(process.env.MONGO_URL, {
	retryWrites: true,
	writeConcern: {
		w: "majority"
	}
});

const guildsPreferences = (await GuildPreferences.find({
	actionRequiredChannelId: { $ne: null }
})) as (IGuildPreferences & { actionRequiredChannelId: string })[];

for (const guildPreferences of guildsPreferences) {
	const guild = await client.guilds.fetch(guildPreferences.guildId);

	if (!guild) continue;

	const actionRequiredChannel = await guild.channels.fetch(
		guildPreferences.actionRequiredChannelId
	);

	if (!actionRequiredChannel || !actionRequiredChannel.isTextBased())
		continue;

	const punishmentsAggregate = await Punishment.aggregate<{
		_id: string;
		totalPoints: number;
	}>([
		{ $match: { guildId: guild.id } },
		{
			$group: { _id: "$actionAgainst", totalPoints: { $sum: "$points" } }
		},
		{ $match: { $expr: { $gte: ["$totalPoints", 10] } } },
		{ $sort: { totalPoints: -1 } }
	]);

	const fields = [] as APIEmbedField[];

	for (const userPunishments of punishmentsAggregate) {
		const member = await guild.members.fetch(userPunishments._id);

		if (!member) continue;

		fields.push({
			name: `${member.user.tag} (${member.id})`,
			value: `Total Points: ${userPunishments.totalPoints}`
		});
	}

	const chunks = Array.from(
		{ length: Math.ceil(fields.length / 25) },
		(_, i) => fields.slice(i * 25, i * 25 + 25)
	);

	const embeds = chunks.map((chunk) =>
		new EmbedBuilder()
			.setTitle("Infraction Points Leaderboard")
			.setDescription(
				"The following users have accumulated 10 or more infraction points."
			)
			.setColor(Colors.DarkNavy)
			.addFields(chunk)
	);

	await actionRequiredChannel.send({
		embeds
	});
}
