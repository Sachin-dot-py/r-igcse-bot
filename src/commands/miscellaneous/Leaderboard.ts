import { Reputation } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Colors,
	ComponentType,
	EmbedBuilder,
	GuildMember,
	SlashCommandBuilder
} from "discord.js";

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

		let page = interaction.options.getInteger("page", false) ?? 1;

		interaction.deferReply()

		const reps = await Reputation.find({
			guildId: interaction.guildId
		}).sort({
			rep: "descending"
		});

		if (reps.length === 0) {
			await interaction.followUp({
				content: "No one in this server has rep 💀",
				ephemeral: true
			});

			return;
		}

		const chunks = Array.from(
			{ length: Math.ceil(reps.length / 9) },
			(_, i) => reps.slice(i * 9, i * 9 + 9)
		);

		const getPage = async (n: number) => {
			if (n > chunks.length || n < 1) return new EmbedBuilder()
				.setTitle("Reputation Leaderboard")
				.setColor(Colors.Blurple).setDescription("Invalid page number")

			const embed = (x => chunks.length === 1 ? x : x.setDescription(`Page ${page} of ${chunks.length}`)

			)(new EmbedBuilder())
				.setTitle("Reputation Leaderboard")
				.setColor(Colors.Blurple)

			for (const { userId, rep } of chunks[n - 1])
				await interaction.guild.members.fetch(userId).then((member) =>
					embed.addFields({
						name: member.user.tag,
						value: `${rep}`,
						inline: true
					})
				).catch(() => { });

			return embed
		}

		const getMessageComponents = () => {
			if (chunks.length === 0) return [];

			const firstButton = new ButtonBuilder()
				.setCustomId("first")
				.setEmoji("⏪")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(page === 0);

			const previousButton = new ButtonBuilder()
				.setCustomId("previous")
				.setEmoji("⬅️")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(page === 0);

			const nextButton = new ButtonBuilder()
				.setCustomId("next")
				.setEmoji("➡️")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(page === chunks.length - 1);

			const lastButton = new ButtonBuilder()
				.setCustomId("last")
				.setEmoji("⏩")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(page === chunks.length - 1);

			return [new ActionRowBuilder<ButtonBuilder>().addComponents(
				firstButton,
				previousButton,
				nextButton,
				lastButton)]
		}

		interaction.followUp({
			embeds: [await getPage(page)],
			components: getMessageComponents()
		})

		const collector = interaction.channel.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: (i) => i.user.id === interaction.user.id
		});

		collector.on("collect", async (i) => {
			i.deferUpdate()

			if (i.customId === "first") page = 0;
			else if (i.customId === "previous") page--;
			else if (i.customId === "next") page++;
			else if (i.customId === "last") page = chunks.length - 1;

			interaction.editReply({
				embeds: [await getPage(page)],
				components: getMessageComponents()
			});
		});
	}
}
