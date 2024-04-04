import { AuditLogEvent, Colors, EmbedBuilder, Events, GuildMember } from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import { GuildPreferencesCache } from "@/redis";
import { Punishment } from "@/mongo";
import humanizeDuration from "humanize-duration";
import Logger from "@/utils/Logger";
import sendDm from "@/utils/sendDm";

export default class GuildMemberUpdateEvent extends BaseEvent {
	constructor() {
		super(Events.GuildMemberUpdate);
	}

	async execute(
		client: DiscordClient<true>,
		oldMember: GuildMember,
		newMember: GuildMember
	) {
        if (oldMember.isCommunicationDisabled() === newMember.isCommunicationDisabled()) return;
        const guildPreferences = await GuildPreferencesCache.get(newMember.guild.id);
        if (!guildPreferences) return;

        const auditLogs = await newMember.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberUpdate,
            limit: 3
        });

        const entry = auditLogs.entries.find(
            (entry) => entry.targetId === newMember.id
        );

        if (!entry || entry.executorId === client.user.id) return;

        const change = entry.changes.find(
            (change) => change.key === "communication_disabled_until"
        );

        if (!change) return;

        const latestPunishment = (
			await Punishment.find({
				guildId: newMember.guild.id
			}).sort({ when: -1 })
		)[0];

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

        if (newMember.isCommunicationDisabled()) {
            // round up to the nearest 10s
            const duration = Math.ceil((new Date(change.new as string).getTime() - new Date().getTime()) / 10000) * 10
            await Punishment.create({
                guildId: newMember.guild.id,
                actionAgainst: newMember.id,
                actionBy: entry.executorId,
                action: "Timeout",
                caseId: caseNumber,
                reason: entry.reason ?? "No reason provided",
                points: duration >= 604800 ? 4 : duration >= 21600 ? 3 : 2,
                when: new Date(),
                duration
            });

            if (guildPreferences.modlogChannelId) {
                const modEmbed = new EmbedBuilder()
                    .setTitle(`Timeout | Case #${caseNumber}`)
                    .setColor(Colors.Red)
                    .addFields([
                        {
                            name: "User",
                            value: `${newMember.user.tag} (${newMember.id})`,
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
                        },
                        {
                            name: "Duration",
                            value: `${humanizeDuration(duration * 1000)} (<t:${Math.floor(Date.now() / 1000) + duration}:R>)`
                        }
                    ]);

                Logger.channel(
                    newMember.guild,
                    guildPreferences.modlogChannelId,
                    {
                        embeds: [modEmbed]
                    }
                );
            }

            sendDm(newMember, {
				embeds: [
					new EmbedBuilder()
						.setTitle("Timeout")
						.setColor(Colors.Red)
						.setDescription(
							`You have been timed out in ${newMember.guild.name} for ${humanizeDuration(duration * 1000)} due to: \`${entry.reason ?? "No reason provided"}\`. Your timeout will end <t:${Math.floor(Date.now() / 1000) + duration}:R>.`
						)
				]
			});
            
        } else {
            const undoPunishment = (
                await Punishment.find({
                    guildId: newMember.guild.id,
                    actionAgainst: newMember.id,
                    action: "Timeout"
                }).sort({ when: -1 })
            )[0];
    
            await Punishment.create({
                guildId: newMember.guild.id,
                actionAgainst: newMember.id,
                actionBy: entry.executorId,
                action: "Remove Timeout",
                reason: entry.reason ?? "",
                points: -(undoPunishment?.points ?? 2),
                caseId: caseNumber,
                when: new Date()
            });

            if (guildPreferences.modlogChannelId) {
                const modEmbed = new EmbedBuilder()
                    .setTitle(`Untimeout | Case #${caseNumber}`)
                    .setColor(Colors.Red)
                    .addFields([
                        {
                            name: "User",
                            value: `${newMember.user.tag} (${newMember.id})`,
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
                    ]);
    
                Logger.channel(
                    newMember.guild,
                    guildPreferences.modlogChannelId,
                    {
                        embeds: [modEmbed]
                    }
                );
            }

            sendDm(newMember, {
				embeds: [
					new EmbedBuilder()
						.setTitle("Removed Timeout")
						.setColor(Colors.Red)
						.setDescription(
							`Your timeout in ${newMember.guild.name} has been removed by a moderator. You can now chat again, make sure to follow the rules.`
						)
				]
			});
        }
    }
}
