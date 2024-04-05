import {
	AuditLogEvent,
	Colors,
	Events,
	EmbedBuilder,
	GuildMember
} from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import { GuildPreferencesCache } from "@/redis";
import { Punishment } from "@/mongo";
import Logger from "@/utils/Logger";

export default class GuildMemberRemoveEvent extends BaseEvent {
	constructor() {
		super(Events.GuildMemberRemove);
	}

	async execute(client: DiscordClient<true>, member: GuildMember) {
		const guildPreferences = await GuildPreferencesCache.get(
			member.guild.id
		);
		if (!guildPreferences) return;

		const auditLogs = await member.guild.fetchAuditLogs({
			type: AuditLogEvent.MemberKick,
			limit: 3
		});

		const entry = auditLogs.entries.find(
			(entry) => entry.targetId === member.id
		);

		if (!entry || entry.executorId === client.user.id) return;

		const latestPunishment = (
			await Punishment.find({
				guildId: member.guild.id
			}).sort({ when: -1 })
		)[0];

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		await Punishment.create({
			guildId: member.guild.id,
			actionAgainst: member.id,
			actionBy: entry.executorId,
			action: "Kick",
			caseId: caseNumber,
			reason: entry.reason ?? "No reason provided",
			points: 0,
			when: new Date()
		});

		if (guildPreferences.modlogChannelId) {
			const modEmbed = new EmbedBuilder()
				.setTitle(`Kick | Case #${caseNumber}`)
				.setColor(Colors.Red)
				.addFields([
					{
						name: "User",
						value: `${member.user.tag} (${member.user.id})`,
						inline: false
					},
					{
						name: "Moderator",
						value: `${entry.executor?.tag} (${entry.executorId})`,
						inline: false
					},
					{
						name: "Reason",
						value: entry.reason ?? "No reason provided",
						inline: false
					}
				])
				.setTimestamp();

			Logger.channel(member.guild, guildPreferences.modlogChannelId, {
				embeds: [modEmbed]
			});
		}
	}
}
