import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import {
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TextChannel
} from "discord.js";

export default class RefreshHelpersCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("refresh_helpers")
				.setDescription("Update helper channel descriptions (for mods)")
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId
		);

		if (!guildPreferences) {
			await interaction.reply({
				content:
					"Please setup the bot using the command `/setup` first.",
				ephemeral: true
			});
			return;
		}

		const studyChannels = await StudyChannel.find({
			guildId: interaction.guildId
		});

		const changed: string[] = [];

		for (const studyChannel of studyChannels) {
			const channel = interaction.guild.channels.cache.get(
				studyChannel.channelId
			);

			if (!channel || !(channel instanceof TextChannel)) continue;

			const role = interaction.guild.roles.cache.get(
				studyChannel.helperRoleId
			);

			if (!role) continue;

			let topic = channel.topic || "";

			if (topic.includes("No. of helpers")) {
				for (const line of topic.split("\n"))
					if (line.includes("No. of helpers"))
						topic.replace(
							line,
							`No. of helpers: ${role.members.size}`
						);
			} else topic += `\nNo. of helpers: ${role.members.size}`;

			await channel.edit({
				topic
			});

			changed.push(channel.name);
		}

		const embed = new EmbedBuilder()
			.setAuthor({
				name: `Helpers Refreshed - ${interaction.user.tag}`,
				iconURL: interaction.user.displayAvatarURL()
			})
			.addFields(
				{
					name: "Channels",
					value: changed.join(", "),
					inline: false
				},
				{
					name: "Date",
					value: `<t:${Date.now()}:F>`,
					inline: false
				}
			);

		if (guildPreferences.modlogChannelId) {
			await Logger.channel(
				interaction.guild,
				guildPreferences.modlogChannelId,
				{
					embeds: [embed]
				}
			);
		}
	}
}
