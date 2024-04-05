import {
	AuditLogEvent,
	Colors,
	Events,
	EmbedBuilder,
	GuildBan
} from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import { GuildPreferencesCache } from "@/redis";
import { Punishment } from "@/mongo";
import Logger from "@/utils/Logger";

export default class GuildBanRemoveEvent extends BaseEvent {
	constructor() {
		super(Events.GuildBanRemove);
	}

	async execute(client: DiscordClient<true>, ban: GuildBan) {
		const guildPreferences = await GuildPreferencesCache.get(ban.guild.id);
		if (!guildPreferences) return;

		const auditLogs = await ban.guild.fetchAuditLogs({
			type: AuditLogEvent.MemberBanRemove,
			limit: 3
		});

		const entry = auditLogs.entries.find(
			(entry) => entry.targetId === ban.user.id
		);

		if (!entry || entry.executorId === client.user.id) return;

		const latestPunishment = (
			await Punishment.find({
				guildId: ban.guild.id
			}).sort({ when: -1 })
		)[0];

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		await Punishment.create({
			guildId: ban.guild.id,
			actionAgainst: ban.user.id,
			actionBy: entry.executorId,
			action: "Unban",
			caseId: caseNumber,
			reason: entry.reason ?? "No reason provided",
			points: 0,
			when: new Date()
		});

		if (guildPreferences.modlogChannelId) {
			const modEmbed = new EmbedBuilder()
				.setTitle(`Unban | Case #${caseNumber}`)
				.setColor(Colors.Red)
				.addFields([
					{
						name: "User",
						value: `${ban.user.tag} (${ban.user.id})`,
						inline: false
					},
					{
						name: "Moderator",
						value: `${entry.executor?.tag} (${entry.executorId})`,
						inline: false
					},
					{
						name: "Reason",
						value: entry.reason ?? "No reason provided"
					}
				])
				.setTimestamp();

			Logger.channel(ban.guild, guildPreferences.modlogChannelId, {
				embeds: [modEmbed]
			});
		}
	}
}
