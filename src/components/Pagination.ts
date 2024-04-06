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

export default class Pagination {
	currentPage: number;
	pages: InteractionEditReplyOptions[];
	constructor(pages: InteractionEditReplyOptions[]) {
		this.currentPage = 0;
		this.pages = pages;
	}

	async start({
		interaction,
		time,
		ephemeral
	}: PaginationStartOptions): Promise<void> {
		const row = await this.getButtons.bind(this)();

		const messageData = this.pages[
			this.currentPage
		] as InteractionReplyOptions;

		const paginatorInteraction = await interaction.reply({
			...messageData,
			components: messageData.components
				? [...messageData.components, row]
				: [row],
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
					this.currentPage = this.pages.length - 1;
					break;
				default:
					break;
			}

			const componentsRow = await this.getButtons.bind(this)();

			const data = this.pages[this.currentPage];

			await interaction.editReply({
				...data,
				components: data.components
					? [...data.components, componentsRow]
					: [componentsRow]
			});
		});

		collector.on("end", async () => {
			const data = this.pages[this.currentPage];
			row.components.forEach((component) => component.setDisabled(true));
			data.components = data.components
				? [...data.components, row]
				: [row];

			await interaction.editReply(data);
		});
	}

	private async getButtons(): Promise<ActionRowBuilder<ButtonBuilder>> {
		const firstButton = new ButtonBuilder()
			.setCustomId("first")
			.setEmoji("⏪")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(this.currentPage === 0);

		const previousButton = new ButtonBuilder()
			.setCustomId("previous")
			.setEmoji("⬅️")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(this.currentPage === 0);

		const lastButton = new ButtonBuilder()
			.setCustomId("last")
			.setEmoji("⏩")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(this.currentPage + 1 === this.pages.length);

		const nextButton = new ButtonBuilder()
			.setCustomId("next")
			.setEmoji("➡️")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(this.currentPage + 1 === this.pages.length);

		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			firstButton,
			previousButton,
			nextButton,
			lastButton
		);
	}
}
