import { ChannelLockdown } from "@/mongo/schemas/ChannelLockdown";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ChannelType,
	ForumChannel,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TextChannel,
	ThreadChannel,
} from "discord.js";
import humanizeDuration from "humanize-duration";
import parse from "parse-duration";

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
							ChannelType.PrivateThread,
						)
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("begin")
						.setDescription(
							"When to start the lockdown. (Defaults to immediately)",
						)
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName("duration")
						.setDescription(
							"When to end the lockdown. (Defaults to 1 day)",
						)
						.setRequired(false),
				)
				.addIntegerOption((option) =>
					option
						.setName("start")
						.setDescription(
							"When to start the lockdown. (Epoch) (Defaults to immediately)",
						)
						.setRequired(false),
				)
				.addIntegerOption((option) =>
					option
						.setName("end")
						.setDescription(
							"When to end the lockdown. (Epoch) (Defaults to 1 day)",
						)
						.setRequired(false),
				)
				.setDMPermission(false)
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ManageChannels,
				),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const channel = interaction.options.getChannel("channel", true, [
			ChannelType.GuildText,
			ChannelType.PublicThread,
			ChannelType.GuildForum,
			ChannelType.PrivateThread,
		]);

		await interaction.deferReply({
			ephemeral: true,
		});

		const time = Math.floor(Date.now() / 1000);

		const start = interaction.options.getInteger("start", false);
		const end = interaction.options.getInteger("end", false);

		const begining = interaction.options.getString("begin", false) ?? "";
		const duration = interaction.options.getString("duration", false) ?? "";

		const startTimestamp = start ?? time + (parse(begining, "second") ?? 0);
		const endTimestamp =
			end ?? startTimestamp + (parse(duration, "second") ?? 86400);

		if (endTimestamp <= startTimestamp) {
			await interaction.editReply({
				content: "Invalid timestamps provided.",
			});

			return;
		}

		if (startTimestamp <= time && endTimestamp >= time)
			if (channel instanceof ThreadChannel) {
				if (channel.locked) {
					await interaction.editReply({
						content: `<#${channel.id}> is already locked.`,
					});

					return;
				}

				await channel.setLocked(true);
			} else if (
				channel instanceof TextChannel ||
				channel instanceof ForumChannel
			) {
				const permissions = channel.permissionsFor(
					interaction.guild.roles.everyone,
				);

				if (!permissions.has(PermissionFlagsBits.SendMessages)) {
					await interaction.editReply({
						content: `<#${channel.id}> is already locked.`,
					});

					return;
				}

				await channel.permissionOverwrites.edit(
					interaction.guild.roles.everyone,
					{
						SendMessages: false,
						SendMessagesInThreads: false,
					},
				);
			}

		await ChannelLockdown.updateOne(
			{
				guildId: interaction.guildId,
				channelId: channel.id,
			},
			{
				startTimestamp: startTimestamp.toString(),
				endTimestamp: endTimestamp.toString(),
			},
			{ upsert: true },
		);

		await interaction.editReply({
			content: `<#${channel.id}> will be locked at <t:${Math.floor(startTimestamp)}:F> for ${humanizeDuration((endTimestamp - startTimestamp) * 1000)}.`,
		});
	}
}
