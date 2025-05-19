import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import { SlashCommandBuilder, VoiceChannel } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "../../registry/Structure/BaseCommand";

export default class GroupStudyCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("group_study")
				.setDescription("Start a group study session")
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel) {
			await interaction.reply({
				content:
					"Please use this command in the channel of the subject.",
				flags: 64,
			});

			return;
		}

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);

		if (!guildPreferences || !guildPreferences.groupStudyChannelId) {
			await interaction.reply({
				content:
					"This guild hasn't configured group study sessions. Please contact an admistrator (`/setup`)",
				flags: 64,
			});

			return;
		}

		const member = interaction.guild.members.cache.get(interaction.user.id);
		if (!member) return;

		if (
			!member.voice.channel ||
			!(member.voice.channel instanceof VoiceChannel)
		) {
			await interaction.reply({
				content: "You must be in a voice channel to use this command.",
				flags: 64,
			});

			return;
		}

		if (member.voice.channel.name !== "General") {
			await interaction.reply({
				content: "This voice channel is already in use.",
			});

			return;
		}

		const groupStudyChannel = await interaction.guild.channels.cache.get(
			guildPreferences.groupStudyChannelId,
		);

		if (!groupStudyChannel) {
			await interaction.reply({
				content:
					"The Group Study Announcement Channel couldn't be found. Please contact an admin.",
				flags: 64,
			});

			return;
		}

		if (!groupStudyChannel.isTextBased()) {
			await interaction.reply({
				content:
					"The Group Study Announcement Channel is of an invalid type. Please contact an admin.",
				flags: 64,
			});

			return;
		}

		const studyChannelData = await StudyChannel.findOne({
			channelId: interaction.channelId,
		});

		if (!studyChannelData) {
			await interaction.reply({
				content:
					"Please use this command in the channel of the subject.",
				flags: 64,
			});

			return;
		}

		const pingRole = interaction.guild.roles.cache.get(
			studyChannelData.studyPingRoleId,
		);

		if (!pingRole) {
			await interaction.reply({
				content:
					"The Study Ping Role couldn't be found. Please contact an admin.",
				flags: 64,
			});

			return;
		}

		const messages = await groupStudyChannel.messages.fetch({
			limit: 10,
		});

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const [_, message] of messages) {
			if (!message.content.includes(`<@${pingRole.id}`)) continue;

			const now = Date.now();

			if (message.createdTimestamp + 3600 < now) continue;

			await interaction.reply({
				content:
					"Please wait for at least 1 hour after the previous group study in this channel.",
				flags: 64,
			});

			return;
		}

		await interaction.reply({
			content: `Successfully started a <#${interaction.channelId}> Group Study Session in <#${member.voice.channel.id}>`,
		});

		await groupStudyChannel.send(
			`<@&${pingRole.id}> - Requested by <@${interaction.user.id}> - Please join <#${member.voice.channel.id}>`,
		);

		await member.voice.channel.edit({
			name: `${interaction.channel.name} Group Study`,
		});
	}
}
