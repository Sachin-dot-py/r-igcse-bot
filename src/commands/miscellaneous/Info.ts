import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	CategoryChannel,
	EmbedBuilder,
	ForumChannel,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TextChannel,
	VoiceChannel,
} from "discord.js";

export default class InfoCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("info")
				.setDescription("Bot information and statistics")
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.setDMPermission(true),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const { format: timeFormatter } = new Intl.DateTimeFormat("en-GB", {
			year: "numeric",
			month: "numeric",
			day: "numeric",
		});

		const embed = new EmbedBuilder().setTitle("Bot Information");
		if (interaction.guild) {
			const channelCount = {
				category: 0,
				text: 0,
				voice: 0,
				forum: 0,
			};

			for (const channel of interaction.guild.channels.cache.values())
				if (channel instanceof TextChannel) channelCount.text++;
				else if (channel instanceof CategoryChannel)
					channelCount.category++;
				else if (channel instanceof VoiceChannel) channelCount.voice++;
				else if (channel instanceof ForumChannel) channelCount.forum++;

			embed.addFields([
				{
					name: "General Information",
					value: `\`\`\`Name: ${client.user.tag}
Created on: ${timeFormatter(client.user.createdAt)}
Joined on: ${timeFormatter(interaction.guild.joinedAt)}
Verified: ${client.user.flags?.has("VerifiedBot") ?? "false"}
No. of guilds: ${client.guilds.cache.size}
Total member count: ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)}
ID: ${client.user.id}\`\`\``,
					inline: false,
				},
				{
					name: "Guild Information",
					value: `\`\`\`Name: ${interaction.guild.name}
Owner: ${(await interaction.guild.fetchOwner()).user.tag}
Created on: ${timeFormatter(interaction.guild.createdAt)}
Members: ${interaction.guild.memberCount}
Boosts: ${interaction.guild.premiumSubscriptionCount}
ID: ${interaction.guild.id}\`\`\``,
					inline: false,
				},
				{
					name: "Channels & Commands",
					value: `\`\`\`No. of roles: ${interaction.guild.roles.cache.size}
No. of members: ${interaction.guild.memberCount}
No. of bots: ${interaction.guild.members.cache.filter((member) => member.user.bot).size}
No. of catagories: ${channelCount.category}
No. of text-channels: ${channelCount.text}
No. of voice-channels: ${channelCount.voice}
No. of forum-channels: ${channelCount.forum}
No. of slash-commands: ${client.commands.size}\`\`\``,
					inline: false,
				},
			]);
		} else {
			embed.addFields([
				{
					name: "Bot Information",
					value: `\`\`\`Name: ${client.user.tag}
Created on: ${timeFormatter(client.user.createdAt)}
Verified: ${client.user.flags?.has("VerifiedBot") ?? "false"}
No. of guilds: ${client.guilds.cache.size}
ID: ${client.user.id}\`\`\``,
					inline: false,
				},
			]);
		}

		await interaction.followUp({
			embeds: [embed],
		});
	}
}
