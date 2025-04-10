// code from https://www.npmjs.com/package/@discordforge/pagination?activeTab=readme and edited by scripted_mari0 to work with interactions

const __defProp = Object.defineProperty;
const __getOwnPropDesc = Object.getOwnPropertyDescriptor;
const __getOwnPropNames = Object.getOwnPropertyNames;
const __hasOwnProp = Object.prototype.hasOwnProperty;
const __export = (target, all) => {
	for (const name in all)
		__defProp(target, name, { get: all[name], enumerable: true });
};
const __copyProps = (to, from, except, desc) => {
	if ((from && typeof from === "object") || typeof from === "function") {
		for (const key of __getOwnPropNames(from))
			if (!__hasOwnProp.call(to, key) && key !== except)
				__defProp(to, key, {
					get: () => from[key],
					enumerable:
						!(desc = __getOwnPropDesc(from, key)) ||
						desc.enumerable,
				});
	}
	return to;
};
const __toCommonJs = (mod) =>
	__copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.ts
const paginationExports = {};
__export(paginationExports, {
	PaginationBuilder: () => PaginationBuilder,
});
module.exports = __toCommonJs(paginationExports);
const importDiscord = require("discord.js");
const PaginationBuilder = class {
	chunks = [];
	title = null;
	color = null;
	page = 0;
	map;
	ephemeral;
	customComponents;
	description = (p, t) => `Page#${p} of ${t}`;
	timedOut = false;
	constructor(
		data,
		map,
		customComponents,
		ephemeral = false,
		options = { itemsPerChunk: 9 },
	) {
		const itemsPerChunk = Math.min(Math.max(options.itemsPerChunk, 1), 25);
		this.chunks = Array.from(
			{ length: Math.ceil(data.length / itemsPerChunk) },
			(_, i) =>
				data.slice(
					i * itemsPerChunk,
					i * itemsPerChunk + itemsPerChunk,
				),
		);
		this.map = map;
		this.customComponents = customComponents;
		this.ephemeral = ephemeral;
	}
	async getPage() {
		const embed = new importDiscord.EmbedBuilder()
			.setTitle(this.title)
			.setColor(this.color)
			.setDescription("No data available");
		const data = this.chunks[this.page];
		if (this.map && this.chunks.length > 0 && data) {
			const fields = [];
			for (const item of data) {
				fields.push(await this.map(item));
			}
			embed
				.setFields(fields)
				.setDescription(
					typeof this.description === "string"
						? this.description
						: this.description(this.page + 1, this.chunks.length),
				);
		}
		return embed;
	}
	getButtons() {
		const disabled = this.timedOut || this.chunks.length < 1;
		const firstButton = new importDiscord.ButtonBuilder()
			.setCustomId("first")
			.setEmoji("\u23EA")
			.setStyle(importDiscord.ButtonStyle.Primary)
			.setDisabled(disabled || this.page === 0);
		const previousButton = new importDiscord.ButtonBuilder()
			.setCustomId("previous")
			.setEmoji("\u2B05\uFE0F")
			.setStyle(importDiscord.ButtonStyle.Primary)
			.setDisabled(disabled || this.page === 0);
		const lastButton = new importDiscord.ButtonBuilder()
			.setCustomId("last")
			.setEmoji("\u23E9")
			.setStyle(importDiscord.ButtonStyle.Primary)
			.setDisabled(disabled || this.page + 1 === this.chunks.length);
		const nextButton = new importDiscord.ButtonBuilder()
			.setCustomId("next")
			.setEmoji("\u27A1\uFE0F")
			.setStyle(importDiscord.ButtonStyle.Primary)
			.setDisabled(disabled || this.page + 1 === this.chunks.length);
		return new importDiscord.ActionRowBuilder().addComponents(
			firstButton,
			previousButton,
			nextButton,
			lastButton,
		);
	}
	setTitle(title) {
		this.title = title;
		return this;
	}
	setDescription(description) {
		this.description = description;
		return this;
	}
	setColor(color) {
		this.color = color;
		return this;
	}
	setInitialPage(page) {
		this.page = page;
		return this;
	}

	async build(
		messageCallback,
		allowedUsers,
		collectorOptions = { time: 6e4 },
	) {
		let { interaction, message } = await messageCallback({
			components: [this.getButtons(), ...this.customComponents],
			embeds: [await this.getPage()],
			ephemeral: this.ephemeral,
		});

		message = await message;

		const collector = message.createMessageComponentCollector({
			componentType: importDiscord.ComponentType.Button,
			filter: (i) => allowedUsers.some((userId) => userId === i.user.id),
			...collectorOptions,
		});

		collector.on("collect", async (i) => {
			await i.deferUpdate();
			switch (i.customId) {
				case "first":
					this.page = 0;
					break;
				case "previous":
					this.page--;
					break;
				case "next":
					this.page++;
					break;
				case "last":
					this.page = this.chunks.length - 1;
					break;
				default:
					break;
			}
			await interaction.editReply({
				components: [this.getButtons(), ...this.customComponents],
				embeds: [await this.getPage()],
				ephemeral: this.ephemeral,
			});
		});
		collector.once("end", () => {
			this.timedOut = true;
			interaction.editReply({
				components: [this.getButtons()],
			});
		});
	}
};
// Annotate the CommonJS export names for ESM import in node:
0 &&
	(module.exports = {
		PaginationBuilder,
	});
