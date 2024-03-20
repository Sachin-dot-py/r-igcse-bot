import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import { SlashCommandBuilder, VoiceChannel } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";

export default class StudySessionCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("study_session")
				.setDescription("Start a study session")
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		if (!interaction.channel) {
			await interaction.reply({
				content:
					"Please use this command in the channel of the subject.",
				ephemeral: true
			});

			return;
		}

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId
		);

		if (!guildPreferences || !guildPreferences.studySessionChannelId) {
			await interaction.reply({
				content:
					"This guild hasn't configured study sessions. Please contact an admistrator (`/setup`)",
				ephemeral: true
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
				ephemeral: true
			});

			return;
		}

		const studySessionChannel = await interaction.guild.channels.cache.get(
			guildPreferences.studySessionChannelId
		);

		if (!studySessionChannel) {
			await interaction.reply({
				content:
					"The Study Session Channel couldn't be found. Please contact an admin.",
				ephemeral: true
			});

			return;
		}

		if (!studySessionChannel.isTextBased()) {
			await interaction.reply({
				content:
					"The Study Session Channel is of an invalid type. Please contact an admin.",
				ephemeral: true
			});

			return;
		}

		const studyChannelData = await StudyChannel.findOne({
			channelId: interaction.channelId
		});

		if (!studyChannelData) {
			await interaction.reply({
				content:
					"Please use this command in the channel of the subject.",
				ephemeral: true
			});

			return;
		}

		const pingRole = await interaction.guild.roles.cache.get(
			studyChannelData.studyPingRoleId
		);

		if (!pingRole) {
			await interaction.reply({
				content:
					"The Study Ping Role couldn't be found. Please contact an admin.",
				ephemeral: true
			});

			return;
		}

		const messages = await studySessionChannel.awaitMessages({
			max: 3
		});

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const [_, message] of messages) {
			if (!message.content.includes(`<@${pingRole.id}`)) continue;

			const now = Date.now();

			if (message.createdTimestamp + 3600 < now) continue;

			await interaction.reply({
				content:
					"Please wait for atleast 1 hour after the previous study session in this channel.",
				ephemeral: true
			});

			return;
		}

		await interaction.reply({
			content: `Successfullt started a <#${interaction.channelId}> Study Session in <${member.voice.channel.id}>`
		});

		await studySessionChannel.send(
			`<@${pingRole.id}> - Requested by <@${interaction.user.id}> - Please join <#${member.voice.channel.id}>`
		);

		await member.voice.channel.edit({
			name: `*${interaction.channel.name}* Study Session`
		});
	}
}
