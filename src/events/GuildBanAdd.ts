import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import { logToChannel } from "@/utils/Logger";
import {
	AuditLogEvent,
	Colors,
	EmbedBuilder,
	Events,
	type GuildBan,
} from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";

export default class GuildBanAddEvent extends BaseEvent {
	constructor() {
		super(Events.GuildBanAdd);
	}

	async execute(client: DiscordClient<true>, ban: GuildBan) {
		const guildPreferences = await GuildPreferencesCache.get(ban.guild.id);
		if (!guildPreferences) return;

		const auditLogs = await ban.guild.fetchAuditLogs({
			type: AuditLogEvent.MemberBanAdd,
			limit: 3,
		});

		const entry = auditLogs.entries.find(
			(entry) => entry.targetId === ban.user.id,
		);

		if (!entry || entry.executorId === client.user.id) return;

		const caseNumber =
			(
				await Punishment.find({
					guildId: ban.guild.id,
				})
			).length + 1;

		await Punishment.create({
			guildId: ban.guild.id,
			actionAgainst: ban.user.id,
			actionBy: entry.executorId,
			action: "Ban",
			caseId: caseNumber,
			reason: entry.reason ?? "No reason provided",
			points: 0,
			when: new Date(),
		});

		if (guildPreferences.modlogChannelId) {
			const modEmbed = new EmbedBuilder()
				.setTitle(`Ban | Case #${caseNumber}`)
				.setColor(Colors.Red)
				.addFields([
					{
						name: "User",
						value: `${ban.user.tag} (${ban.user.id})`,
						inline: false,
					},
					{
						name: "Moderator",
						value: `${entry.executor?.tag} (${entry.executorId})`,
						inline: false,
					},
					{
						name: "Reason",
						value: entry.reason ?? "No reason provided",
					},
				])
				.setTimestamp();

			logToChannel(ban.guild, guildPreferences.modlogChannelId, {
				embeds: [modEmbed],
			});
		}
	}
}
