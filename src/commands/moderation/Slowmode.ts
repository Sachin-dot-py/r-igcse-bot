import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { logToChannel } from "@/utils/Logger";
import {
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import humanizeDuration from "humanize-duration";
import parse from "parse-duration";

export default class SlowmodeCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("slowmode")
				.setDescription("Set the slowmode time (for mods)")
				.setDMPermission(false)
				.addStringOption((option) =>
					option
						.setName("time")
						.setDescription("Slowmode time")
						.setRequired(true),
				)
				.addChannelOption((option) =>
					option
						.setName("channel")
						.setDescription("The channel to add the slowmode to")
						.setRequired(false),
				)
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ManageChannels,
				),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const timeString = interaction.options.getString("time", true);
		const channel =
			interaction.options.getChannel("channel", false) ??
			interaction.channel;

		const isNumber = /^\d+$/.test(timeString);
		const time = isNumber
			? Number.parseInt(timeString)
			: parse(timeString, "second") ?? 0;

		if (!isNumber && time === 0) {
			interaction.reply({
				content:
					"Invalid slowmode duration. Please provide a valid numerical duration (e.g., '5s', '1m', '1h').",
				ephemeral: true,
			});
			return;
		}

		if (!channel || !channel.isTextBased()) {
			interaction.reply({
				content: "Channel must be text-based.",
				ephemeral: true,
			});
			return;
		}

		if (time > 21600 || time < 0) {
			interaction.reply({
				content: "Enter a valid time between 0 seconds and 6 hours.",
				ephemeral: true,
			});
			return;
		}

		await channel.setRateLimitPerUser(
			time,
			`Slowmode set by ${interaction.user.tag}`,
		);

		interaction.reply({
			content: `Slowmode for ${channel} successfully set to ${timeString}.`,
			ephemeral: true,
		});

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);

		if (!guildPreferences || !guildPreferences.generalLogsChannelId) {
			interaction.followUp({
				content: "Please setup the bot using /setup to enable logging.",
				ephemeral: true,
			});
			return;
		}

		try {
			logToChannel(
				interaction.guild,
				guildPreferences.generalLogsChannelId,
				{
					embeds: [
						new EmbedBuilder()
							.setTitle("Slowmode added")
							.setDescription(`Slowmode added in ${channel}`)
							.setColor("Red")
							.addFields(
								{
									name: "Moderator",
									value: `${interaction.user.tag} (<@${interaction.user.id}>)`,
								},
								{
									name: "Duration",
									value: `${humanizeDuration(time * 1000)}`,
								},
							)
							.setTimestamp(),
					],
					allowedMentions: { repliedUser: false },
				},
			);
		} catch (error) {
			console.error("Error logging to channel:", error);
			interaction.followUp({
				content: "Invalid log channel, contact admins.",
				ephemeral: true,
			});
		}
	}
}
