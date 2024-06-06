import { Keyword } from "@/mongo/schemas/Keyword";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { PaginationBuilder } from "@discordforge/pagination";
import { Colors, SlashCommandBuilder } from "discord.js";

export default class ListKeywordsCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("list_keywords")
				.setDescription(
					"Display all the keywords in the current server",
				)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel || !interaction.channel.isTextBased()) return;

		await interaction.deferReply();

		const keywords = (
			await Keyword.find({
				guildId: interaction.guildId,
			})
		).map((keyword) => keyword.keyword);

		if (keywords.length === 0) {
			interaction.followUp({
				content: "There are no keywords in this server",
				ephemeral: true,
			});

			return;
		}

		new PaginationBuilder(keywords, async (keyword) => ({
			name: keyword,
			value: "\n",
			inline: true,
		}))
			.setTitle("Keywords")
			.setColor(Colors.Blurple)
			.build((page) => interaction.followUp(page), [interaction.user.id]);
	}
}
