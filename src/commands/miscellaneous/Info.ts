import { CategoryChannel, EmbedBuilder, ForumChannel, PermissionFlagsBits, SlashCommandBuilder, TextChannel, VoiceChannel } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";

export default class InfoCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("info")
				.setDescription("Bot information and statistics")
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction
	) {
		await interaction.deferReply();


		const mainGuild = client.guilds.cache.get(process.env.MAIN_GUILD_ID);

		const { format: timeFormatter } = new Intl.DateTimeFormat("en-GB", {
			year: "numeric",
			month: "numeric",
			day: "numeric"
		});

		var embed = new EmbedBuilder()
			.setTitle('Bot Information')
		if (mainGuild) {

			const channelCount = {
				category: 0,
				text: 0,
				voice: 0,
				forum: 0
			};

			for (const channel of mainGuild.channels.cache.values())
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
Joined on: ${timeFormatter(mainGuild.joinedAt)}
Verified: ${client.user.flags?.has("VerifiedBot") ?? "false"}
No. of guilds: ${client.guilds.cache.size}
ID: ${client.user.id}\`\`\``,
					inline: false
				},
				{
					name: "Guild Information",
					value: `\`\`\`Name: ${mainGuild.name}
Owner: ${(await mainGuild.fetchOwner()).user.tag}
Created on: ${timeFormatter(mainGuild.createdAt)}
Members: ${mainGuild.memberCount}
Boosts: ${mainGuild.premiumSubscriptionCount}
ID: ${mainGuild.id}\`\`\``,
					inline: false
				},
				{
					name: "Channels & Commands",
					value: `\`\`\`No. of roles: ${mainGuild.roles.cache.size}
No. of members: ${mainGuild.memberCount}
No. of bots: ${mainGuild.members.cache.filter((member) => member.user.bot).size}
No. of catagories: ${channelCount.category}
No. of text-channels: ${channelCount.text}
No. of voice-channels: ${channelCount.voice}
No. of forum-channels: ${channelCount.forum}
No. of slash-commands: ${client.commands.size}\`\`\``,
					inline: false
				}
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
					inline: false
				}])
		}


		await interaction.followUp({
			embeds: [embed]
		});
	}
}
