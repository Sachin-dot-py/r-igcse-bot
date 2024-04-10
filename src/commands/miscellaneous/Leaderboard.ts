import { Reputation } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import Pagination from "@/components/Pagination";

export default class LeaderboardCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("leaderboard")
				.setDescription("View the current rep leaderboard")
				.setDMPermission(false)
				.addIntegerOption((option) =>
					option
						.setName("page")
						.setDescription("Page number to to display")
						.setRequired(false)
				)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		if (!interaction.channel || !interaction.channel.isTextBased()) return;

		let page = (interaction.options.getInteger("page", false) ?? 1) - 1;

		await interaction.deferReply();

		const reps = await Reputation.find({
			guildId: interaction.guildId
		}).sort({
			rep: "descending"
		});

		if (reps.length === 0) {
			interaction.followUp({
				content: "No one in this server has rep 💀",
				ephemeral: true
			});

			return;
		}

		const chunks = Array.from(
			{ length: Math.ceil(reps.length / 9) },
			(_, i) => reps.slice(i * 9, i * 9 + 9)
		);

		const paginator = new Pagination(
			chunks,
			async (chunk) => {
				const embed = new EmbedBuilder()
					.setTitle("Rep Leaderboard")
					.setColor(Colors.Blurple)
					.setDescription(
						`Page ${chunks.indexOf(chunk) + 1} of ${chunks.length}`
					);

				for (const { userId, rep } of chunk) {
					const user = await client.users.fetch(userId);

					embed.addFields({
						name: user.tag,
						value: `${rep}`,
						inline: true
					});
				}

				return { embeds: [embed] };
			},
			page
		);

		await paginator.start({
			interaction,
			ephemeral: false
		});
	}
}
