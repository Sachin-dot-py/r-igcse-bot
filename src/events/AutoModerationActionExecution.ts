import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import Logger from "@/utils/Logger";
import {
	AutoModerationActionExecution,
	AutoModerationActionType,
	Colors,
	EmbedBuilder,
	Events
} from "discord.js";
import humanizeDuration from "humanize-duration";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";

export default class ErrorEvent extends BaseEvent {
	constructor() {
		super(Events.AutoModerationActionExecution);
	}

	async execute(
		client: DiscordClient<true>,
		autoModerationActionExecution: AutoModerationActionExecution
	) {
		if (
			!(
				autoModerationActionExecution.action.type ===
				AutoModerationActionType.Timeout
			) ||
			!autoModerationActionExecution.user
		)
			return;

		const duration =
			autoModerationActionExecution.action.metadata.durationSeconds ?? 0;

		const reason =
			autoModerationActionExecution.action.metadata.customMessage || null;

		const durationString = humanizeDuration(duration * 1000);

		const latestPunishment = await Punishment.findOne()
			.sort({ createdAt: 1 })
			.exec();

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		await Punishment.create({
			guildId: autoModerationActionExecution.guild.id,
			actionAgainst: autoModerationActionExecution.userId,
			actionBy: "Auto Mod",
			action: "Timeout",
			caseId: caseNumber,
			duration,
			reason,
			points: duration >= 604800 ? 4 : duration >= 21600 ? 3 : 2
		});

		const modEmbed = new EmbedBuilder()
			.setTitle(`User Timed Out | Case #${caseNumber} | Auto Mod`)
			.setDescription(reason)
			.setColor(Colors.Red)
			.setAuthor({
				name: autoModerationActionExecution.user.tag,
				iconURL: autoModerationActionExecution.user.displayAvatarURL()
			})
			.addFields([
				{
					name: "User ID",
					value: autoModerationActionExecution.user.id,
					inline: true
				},
				{
					name: "Duration",
					value: durationString,
					inline: true
				},
				{
					name: "Reason",
					value: reason || "No reason provided.",
					inline: false
				}
			]);

		const guildPreferences = await GuildPreferencesCache.get(
			autoModerationActionExecution.guild.id
		);

		if (!guildPreferences || !guildPreferences.modlogChannelId) return;

		await Logger.channel(
			autoModerationActionExecution.guild,
			guildPreferences.modlogChannelId,
			{
				embeds: [modEmbed]
			}
		);
	}
}
