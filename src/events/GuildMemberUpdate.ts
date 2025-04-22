import { Punishment } from "@/mongo";
import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import { GuildPreferencesCache } from "@/redis";
import { logToChannel } from "@/utils/Logger";
import sendDm from "@/utils/sendDm";
import { Logger } from "@discordforge/logger";
import {
	AuditLogEvent,
	Colors,
	EmbedBuilder,
	Events,
	type GuildMember,
	TextChannel,
} from "discord.js";
import humanizeDuration from "humanize-duration";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";

export default class GuildMemberUpdateEvent extends BaseEvent {
	constructor() {
		super(Events.GuildMemberUpdate);
	}

	async execute(
		client: DiscordClient<true>,
		oldMember: GuildMember,
		newMember: GuildMember,
	) {
		if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
			try {
				const rolesUpdated = newMember.roles.cache
					.filter((x) => !oldMember.roles.cache.has(x.id))
					.concat(
						oldMember.roles.cache.filter(
							(x) => !newMember.roles.cache.has(x.id),
						),
					);
				for (const role of rolesUpdated) {
					const guildPreferences = await GuildPreferencesCache.get(
						newMember.guild.id,
					);
					const studyChannels = await StudyChannel.find({
						guildId: newMember.guild.id,
						helperRoleId: role[0],
					});
					const changed: string[] = [];

					for (const studyChannel of studyChannels) {
						const channel = newMember.guild.channels.cache.get(
							studyChannel.channelId,
						);

						if (!channel || !(channel instanceof TextChannel))
							continue;

						const role = newMember.guild.roles.cache.get(
							studyChannel.helperRoleId,
						);

						if (!role) continue;
						let topic = channel.topic || "";
						if (topic.includes("No. of helpers")) {
							for (const line of topic.split("\n"))
								if (line.includes("No. of helpers"))
									topic = topic.replace(
										line,
										`No. of helpers: ${role.members.size}`,
									);
						} else
							topic += `\nNo. of helpers: ${role.members.size}`;
						await channel.edit({
							topic,
						});
						changed.push(channel.name);
					}
					if (studyChannels.length) {
						const embed = new EmbedBuilder()
							.setAuthor({
								name: `Helpers Refreshed (automated) - ${newMember.user.tag}`,
								iconURL: newMember.displayAvatarURL(),
							})
							.addFields({
								name: "Channels",
								value: changed.join(", "),
								inline: false,
							})
							.setTimestamp();

						if (guildPreferences?.generalLogsChannelId) {
							await logToChannel(
								newMember.guild,
								guildPreferences.generalLogsChannelId,
								{
									embeds: [embed],
								},
							);
						}
					}
				}
			} catch (err) {
				Logger.error(err);
			}
		}
		if (
			oldMember.user.bot ||
			(oldMember.isCommunicationDisabled() ===
				newMember.isCommunicationDisabled() &&
				oldMember.communicationDisabledUntil ===
					newMember.communicationDisabledUntil)
		)
			return;

		const guildPreferences = await GuildPreferencesCache.get(
			newMember.guild.id,
		);
		if (!guildPreferences) return;
		const auditLogs = await newMember.guild.fetchAuditLogs({
			type: AuditLogEvent.MemberUpdate,
			limit: 3,
		});

		const entry = auditLogs.entries.find(
			(entry) => entry.targetId === newMember.id,
		);

		if (
			!entry ||
			entry.executorId === client.user.id ||
			entry.executor?.bot
		)
			return;

		const change = entry.changes.find(
			(change) => change.key === "communication_disabled_until",
		);

		if (!change) return;

		const caseNumber =
			(
				await Punishment.find({
					guildId: newMember.guild.id,
				})
			).length + 1;

		if (newMember.isCommunicationDisabled()) {
			// round up to the nearest 10s
			const duration =
				Math.ceil(
					(new Date(change.new as string).getTime() -
						new Date().getTime()) /
						10000,
				) * 10;

			if (
				oldMember.isCommunicationDisabled() !==
				newMember.isCommunicationDisabled()
			) {
				await Punishment.create({
					guildId: newMember.guild.id,
					actionAgainst: newMember.id,
					actionBy: entry.executorId,
					action: "Timeout",
					caseId: caseNumber,
					reason: entry.reason ?? "No reason provided",
					points: duration >= 604800 ? 4 : duration >= 21600 ? 3 : 2,
					when: new Date(),
					duration,
				});

				if (guildPreferences.modlogChannelId) {
					const modEmbed = new EmbedBuilder()
						.setTitle(`Timeout | Case #${caseNumber}`)
						.setColor(Colors.Red)
						.addFields([
							{
								name: "User",
								value: `${newMember.user.tag} (${newMember.id})`,
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
							{
								name: "Duration",
								value: `${humanizeDuration(duration * 1000)} (<t:${
									Math.floor(Date.now() / 1000) + duration
								}:R>)`,
							},
						]);

					logToChannel(
						newMember.guild,
						guildPreferences.modlogChannelId,
						{
							embeds: [modEmbed],
						},
					);
				}

				sendDm(newMember, {
					embeds: [
						new EmbedBuilder()
							.setTitle("Timeout")
							.setColor(Colors.Red)
							.setDescription(
								`You have been timed out in ${
									newMember.guild.name
								} for ${humanizeDuration(duration * 1000)} due to: \`${
									entry.reason ?? "No reason provided"
								}\`. Your timeout will end <t:${
									Math.floor(Date.now() / 1000) + duration
								}:R>.`,
							),
					],
				});
			} else {
				const latestTimeout = (
					await Punishment.find({
						guildId: newMember.guild.id,
						actionAgainst: newMember.id,
						action: "Timeout",
					}).sort({ when: -1 })
				)?.[0];

				latestTimeout.duration = duration;
				latestTimeout.reason += `, ${entry.reason ?? "No reason provided"}`;
				latestTimeout.actionBy =
					entry.executorId ?? latestTimeout.actionBy;
				latestTimeout.points =
					duration >= 604800 ? 4 : duration >= 21600 ? 3 : 2;
				latestTimeout.save();

				if (guildPreferences.modlogChannelId) {
					const modEmbed = new EmbedBuilder()
						.setTitle(
							`Timeout Duration Modified | Case #${latestTimeout.caseId}`,
						)
						.setColor(Colors.Red)
						.addFields([
							{
								name: "User",
								value: `${newMember.user.tag} (${newMember.id})`,
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
							{
								name: "Duration",
								value: `${humanizeDuration(duration * 1000)} (<t:${
									Math.floor(Date.now() / 1000) + duration
								}:R>)`,
							},
						]);

					logToChannel(
						newMember.guild,
						guildPreferences.modlogChannelId,
						{
							embeds: [modEmbed],
						},
					);
				}

				sendDm(newMember, {
					embeds: [
						new EmbedBuilder()
							.setTitle("Timeout Duration Modified")
							.setColor(Colors.Red)
							.setDescription(
								`Your timeout duration in ${
									newMember.guild.name
								} has been modified by a moderator. It will now end at <t:${
									Math.floor(Date.now() / 1000) + duration
								}:R>.`,
							),
					],
				});
			}
		} else {
			const undoPunishment = (
				await Punishment.find({
					guildId: newMember.guild.id,
					actionAgainst: newMember.id,
					action: "Timeout",
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
				when: new Date(),
			});

			if (guildPreferences.modlogChannelId) {
				const modEmbed = new EmbedBuilder()
					.setTitle(`Untimeout | Case #${caseNumber}`)
					.setColor(Colors.Red)
					.addFields([
						{
							name: "User",
							value: `${newMember.user.tag} (${newMember.id})`,
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
					]);

				logToChannel(
					newMember.guild,
					guildPreferences.modlogChannelId,
					{
						embeds: [modEmbed],
					},
				);
			}

			sendDm(newMember, {
				embeds: [
					new EmbedBuilder()
						.setTitle("Removed Timeout")
						.setColor(Colors.Red)
						.setDescription(
							`Your timeout in ${newMember.guild.name} has been removed by a moderator. You can now chat again, make sure to follow the rules.`,
						),
				],
			});
		}
	}
}
