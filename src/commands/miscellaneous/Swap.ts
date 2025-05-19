import Select from "@/components/Select";
import Buttons from "@/components/practice/views/Buttons";
import { DmGuildPreference } from "@/mongo/schemas/DmGuildPreference";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	type ButtonBuilder,
	SlashCommandBuilder,
	StringSelectMenuOptionBuilder,
} from "discord.js";
import { v4 } from "uuid";

export default class PingCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("swap")
				.setDescription("Switch Modmail DM Server (dms only)"),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction,
	) {
		if (interaction.guild) {
			interaction.reply({
				content: "This command is intended for DMs",
				flags: 64,
			});

			return;
		}

		const guilds = client.guilds.cache.filter((guild) =>
			guild.members.cache.has(interaction.user.id),
		);

		if (!guilds.size) {
			interaction.reply({
				content:
					"Please try sending a message in the server you're trying to contact.",
				flags: 64,
			});

			return;
		}

		const selectCustomId = v4();
		const guildSelect = new Select(
			"guildSelect",
			"Select a server",
			guilds.map((guild) =>
				new StringSelectMenuOptionBuilder()
					.setLabel(guild.name)
					.setValue(guild.id),
			),
			1,
			`${selectCustomId}_0`,
		);

		const row = new ActionRowBuilder<Select>().addComponents(guildSelect);

		const selectInteraction = await interaction.reply({
			content: "Select a server to send a message to",
			components: [
				row,
				new Buttons(selectCustomId) as ActionRowBuilder<ButtonBuilder>,
			],
		});

		const message = await selectInteraction.fetch();
		const guildResponse = await guildSelect.waitForResponse(
			`${selectCustomId}_0`,
			message,
			message,
			true,
		);

		if (!guildResponse || guildResponse === "Timed out") return;
		const guild = client.guilds.cache.get(guildResponse[0]);

		if (!guild) {
			selectInteraction.edit({
				content: "Invalid Server",
				components: [],
			});

			return;
		}

		selectInteraction.edit({
			content: `Server ${guild.name} selected.`,
			components: [],
		});

		await DmGuildPreference.updateOne(
			{ userId: interaction.user.id },
			{ guildId: guild.id },
			{ upsert: true },
		);
	}
}
