import { Reputation } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Colors,
	ComponentType,
	EmbedBuilder,
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

		let page = (interaction.options.getInteger("page", false) ?? 1) - 1;

		const reps = await Reputation.find({
			guildId: interaction.guildId
		}).sort({
			rep: "descending"
		});

		if (reps.length === 0) {
			await interaction.reply({
				content: "No one in this server has rep 💀",
				ephemeral: true
			});

			return;
		}

		const chunks = Array.from(
			{ length: Math.ceil(reps.length / 9) },
			(_, i) => reps.slice(i * 9, i * 9 + 9)
		);

		const embeds: EmbedBuilder[] = [];

		for (const [i, chunk] of chunks.entries()) {
			const embed = new EmbedBuilder()
				.setTitle("Reputation Leaderboard")
				.setColor(Colors.Blurple)
				.setDescription(`Page ${i + 1} of ${chunks.length}`);

			for (const { userId, rep } of chunk) {
				const member = interaction.guild.members.cache.get(userId);

				if (!member) continue;

				embed.addFields({
					name: member.user.tag,
					value: `${rep}`,
					inline: true
				});
			}

			embeds.push(embed);
		}
		console.log(embeds[0], embeds[1])
		const getButtons = () => {
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

			const lastButton = new ButtonBuilder()
				.setCustomId("last")
				.setEmoji("⏩")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(page === chunks.length);

			const nextButton = new ButtonBuilder()
				.setCustomId("next")
				.setEmoji("➡️")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(page === chunks.length);

			return new ActionRowBuilder<ButtonBuilder>().addComponents(
				firstButton,
				previousButton,
				lastButton,
				nextButton
			);
		}

		await interaction.reply({
			embeds: [embeds[page]],
			components: [getButtons()]
		});

		const collector = interaction.channel.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: (i) => i.user.id === interaction.user.id
		});

		collector.on("collect", (i) => {
			i.deferUpdate()

			if (i.customId === "first") page = 0;
			else if (i.customId === "previous") page--;
			else if (i.customId === "next") page++;
			else if (i.customId === "last") page = chunks.length - 1;

			interaction.editReply({
				embeds: [embeds[page]],
				components: [getButtons()]
			});
		});
	}
}
