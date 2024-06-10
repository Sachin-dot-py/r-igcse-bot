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

export default class RemoveLockdownCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("remove_lockdown")
				.setDescription("Remove a lockdown from a text channel")
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

		await ChannelLockdown.deleteOne({
			channelId: channel.id,
		});

		if (channel instanceof ThreadChannel) {
			if (!channel.locked) {
				await interaction.reply({
					content: `<#${channel.id}> isn't locked.`,
					ephemeral: true,
				});

				return;
			}

			await channel.setLocked(false);
		} else if (
			channel instanceof TextChannel ||
			channel instanceof ForumChannel
		) {
			const permissions = channel.permissionsFor(
				interaction.guild.roles.everyone,
			);

			if (
				permissions.has(PermissionFlagsBits.SendMessages) &&
				permissions.has(PermissionFlagsBits.SendMessagesInThreads)
			) {
				await interaction.reply({
					content: `<#${channel.id}> isn't locked.`,
					ephemeral: true,
				});

				return;
			}

			await channel.permissionOverwrites.edit(
				interaction.guild.roles.everyone,
				{
					SendMessages: true,
					SendMessagesInThreads: true,
				},
			);
		}

		await interaction.reply({
			content: `<#${channel.id}> has been unlocked.`,
			ephemeral: true,
		});
	}
}
