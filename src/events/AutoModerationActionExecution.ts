import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import { logToChannel } from "@/utils/Logger";
import {
	type AutoModerationActionExecution,
	AutoModerationActionType,
	Colors,
	EmbedBuilder,
	Events,
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
		autoModerationActionExecution: AutoModerationActionExecution,
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

		const reason = autoModerationActionExecution.action.metadata.customMessage || autoModerationActionExecution.autoModerationRule?.name;

		const durationString = humanizeDuration(duration * 1000);

		const caseNumber =
			(
				await Punishment.find({
					guildId: autoModerationActionExecution.guild.id,
				})
			).length + 1;

		await Punishment.create({
			guildId: autoModerationActionExecution.guild.id,
			actionAgainst: autoModerationActionExecution.userId,
			actionBy: "Auto Mod",
			action: "Timeout",
			caseId: caseNumber,
			duration,
			reason: reason,
			points: duration >= 604800 ? 4 : duration >= 21600 ? 3 : 2,
			when: new Date(),
		});

		const modEmbed = new EmbedBuilder()
			.setTitle(`Timeout | Case #${caseNumber}`)
			.setDescription(reason ?? null)
			.setColor(Colors.Red)
			.addFields([
				{
					name: "Username",
					value: `${autoModerationActionExecution.user.tag} (${autoModerationActionExecution.user.id})`,
				},
				{
					name: "Moderator",
					value: "AutoMod",
				},
				{
					name: "Reason",
					value: autoModerationActionExecution.autoModerationRule?.name || "No reason provided",
				},
				{
					name: "Duration",
					value: `${durationString} (<t:${
						Math.floor(Date.now() / 1000) + duration
					}:R>)`,
				},
			]);

		const guildPreferences = await GuildPreferencesCache.get(
			autoModerationActionExecution.guild.id,
		);

		if (!guildPreferences || !guildPreferences.modlogChannelId) return;

		logToChannel(
			autoModerationActionExecution.guild,
			guildPreferences.modlogChannelId,
			{
				embeds: [modEmbed],
			},
		);
	}
}
