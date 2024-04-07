import type { DiscordChatInputCommandInteraction } from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	type InteractionEditReplyOptions,
	type InteractionReplyOptions
} from "discord.js";

interface PaginationStartOptions {
	interaction: DiscordChatInputCommandInteraction<"cached">;
	time?: number;
	ephemeral: boolean;
}

export default class Pagination<T> {
	constructor(
		private chunks: T[][],
		private mapChunk: (chunk: T[]) => Promise<InteractionEditReplyOptions>,
		private currentPage = 0
	) {
		if (this.currentPage < 0) this.currentPage = 0;
		if (this.currentPage >= this.chunks.length)
			this.currentPage = this.chunks.length - 1;
	}

	async start({
		interaction,
		time,
		ephemeral
	}: PaginationStartOptions): Promise<void> {
		const row = await this.getButtons.bind(this)();

		const messageData = (await this.mapChunk(
			this.chunks[this.currentPage]
		)) as InteractionReplyOptions;

		const paginatorInteraction =
			interaction.deferred || interaction.replied
				? await interaction.editReply({
						...messageData,
						components: [...(messageData.components ?? []), row]
					})
				: await interaction.reply({
						...messageData,
						components: [...(messageData.components ?? []), row],
						ephemeral
					});

		const collector = paginatorInteraction.createMessageComponentCollector({
			filter: (i) => i.user.id === interaction.user.id,
			time: time ?? 300_000,
			componentType: ComponentType.Button
		});

		collector.on("collect", async (i) => {
			i.deferUpdate();

			switch (i.customId) {
				case "first":
					this.currentPage = 0;
					break;
				case "previous":
					this.currentPage--;
					break;
				case "next":
					this.currentPage++;
					break;
				case "last":
					this.currentPage = this.chunks.length - 1;
					break;
				default:
					break;
			}

			const componentsRow = await this.getButtons.bind(this)();

			const data = await this.mapChunk(this.chunks[this.currentPage]);

			await interaction.editReply({
				...data,
				components: [...(messageData.components ?? []), componentsRow]
			});
		});

		collector.on("end", async () => {
			const data = await this.mapChunk(this.chunks[this.currentPage]);
			const componentsRow = await this.getButtons.bind(this)(true);

			await interaction.editReply({
				...data,
				components: [...(messageData.components ?? []), componentsRow],
				content: "Timed out!"
			});
		});
	}

	private async getButtons(
		disabled?: boolean
	): Promise<ActionRowBuilder<ButtonBuilder>> {
		const firstButton = new ButtonBuilder()
			.setCustomId("first")
			.setEmoji("⏪")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(disabled ?? this.currentPage === 0);

		const previousButton = new ButtonBuilder()
			.setCustomId("previous")
			.setEmoji("⬅️")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(disabled ?? this.currentPage === 0);

		const lastButton = new ButtonBuilder()
			.setCustomId("last")
			.setEmoji("⏩")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(
				disabled ?? this.currentPage + 1 === this.chunks.length
			);

		const nextButton = new ButtonBuilder()
			.setCustomId("next")
			.setEmoji("➡️")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(
				disabled ?? this.currentPage + 1 === this.chunks.length
			);

		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			firstButton,
			previousButton,
			nextButton,
			lastButton
		);
	}
}
