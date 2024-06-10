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

		const time = /^\d+$/.test(timeString)
			? Number.parseInt(timeString)
			: parse(timeString, "second") ?? 0;

		if (!channel || !channel.isTextBased()) {
			interaction.reply({
				content: "Channel must be text-based",
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
			interaction.reply({
				content:
					"Please setup the bot using the command `/setup` first.",
				ephemeral: true,
			});
			return;
		}

		logToChannel(interaction.guild, guildPreferences.generalLogsChannelId, {
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
		}).catch(() => {
			interaction.followUp({
				content: "Invalid log channel, contact admins",
				ephemeral: true,
			});
		});

		return;
	}
}
