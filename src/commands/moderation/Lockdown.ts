import { ChannelLockdown } from "@/mongo/schemas/ChannelLockdown";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
	ChannelType,
	ForumChannel,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TextChannel,
	ThreadChannel
} from "discord.js";
import humanizeDuration from "humanize-duration";

export default class LockdownCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("lockdown")
				.setDescription("Lockdown a text channel")
				.addChannelOption((option) =>
					option
						.setName("channel")
						.setDescription("The channel to lock")
						.addChannelTypes(
							ChannelType.GuildText,
							ChannelType.PublicThread,
							ChannelType.GuildForum,
							ChannelType.PrivateThread
						)
						.setRequired(true)
				)
				.addIntegerOption((option) =>
					option
						.setName("start_time")
						.setDescription(
							"When to start the lockdown. (Epoch) (Defaults to immediately)"
						)
						.setRequired(false)
				)
				.addIntegerOption((option) =>
					option
						.setName("end_time")
						.setDescription(
							"When to end the lockdown. (Epoch) (Defaults to 1 day)"
						)
						.setRequired(false)
				)
				.setDMPermission(false)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const channel = interaction.options.getChannel("channel", true, [
			ChannelType.GuildText,
			ChannelType.PublicThread,
			ChannelType.GuildForum,
			ChannelType.PrivateThread
		]);

		const time = Math.floor(Date.now() / 1000);

		const startTimestamp =
			interaction.options.getInteger("start_time", false) ?? time;
		const endTimestamp =
			interaction.options.getInteger("end_time", false) ?? time + 86400;

		if (endTimestamp <= startTimestamp) {
			await interaction.reply({
				content: `Invalid timestamps provided.`,
				ephemeral: true
			});

			return;
		}

		if (startTimestamp <= time && endTimestamp >= time)
			if (channel instanceof ThreadChannel) {
				if (channel.locked) {
					await interaction.reply({
						content: `<#${channel.id}> is already locked.`,
						ephemeral: true
					});

					return;
				}

				await channel.setLocked(true);
			} else if (
				channel instanceof TextChannel ||
				channel instanceof ForumChannel
			) {
				const permissions = channel.permissionsFor(
					interaction.guild.roles.everyone
				);

				if (!permissions.has(PermissionFlagsBits.SendMessages)) {
					await interaction.reply({
						content: `<#${channel.id}> is already locked.`,
						ephemeral: true
					});

					return;
				}

				await channel.permissionOverwrites.edit(
					interaction.guild.roles.everyone,
					{
						SendMessages: false,
						SendMessagesInThreads: false
					}
				);
			}

		await ChannelLockdown.updateOne(
			{
				channelId: channel.id
			},
			{
				startTimestamp: startTimestamp.toString(),
				endTimestamp: endTimestamp.toString()
			},
			{ upsert: true }
		);

		await interaction.reply({
			content: `<#${channel.id}> will been locked in <t:${startTimestamp}:F> for ${humanizeDuration((endTimestamp - startTimestamp) * 1000)}.`,
			ephemeral: true
		});
	}
}
