import { GuildPreferencesCache } from "@/redis";
import Logger from "@/utils/Logger";
import {
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	EmbedBuilder,
	Events,
	type Interaction,
} from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";

export default class InteractionCreateEvent extends BaseEvent {
	constructor() {
		super(Events.InteractionCreate);
	}

	async execute(client: DiscordClient<true>, interaction: Interaction) {
		try {
			if (interaction.isChatInputCommand())
				this.handleCommand(client, interaction);
			else if (interaction.isContextMenuCommand())
				this.handleMenu(client, interaction);
		} catch (error) {
			Logger.error(error);

			if (!interaction.inCachedGuild()) return;

			const embed = new EmbedBuilder()
				.setAuthor({
					name: "An Exception Occured",
					iconURL: client.user.displayAvatarURL(),
				})
				.setDescription(
					`Channel: <#${interaction.channelId}> \nUser: <@${interaction.user.id}>\nError: ${error}`,
				);

			const guildPreferences = await GuildPreferencesCache.get(
				interaction.guildId,
			);

			await Logger.channel(
				interaction.guild,
				guildPreferences.botlogChannelId,
				{ embeds: [embed] },
			);
		}
	}

	async handleCommand(
		client: DiscordClient<true>,
		interaction: ChatInputCommandInteraction,
	) {
		const command = client.commands.get(interaction.commandName);
		if (!command) return;

		await command.execute(client, interaction);
	}
	async handleMenu(
		client: DiscordClient<true>,
		interaction: ContextMenuCommandInteraction,
	) {
		const menu = client.menus.get(interaction.commandName);
		if (!menu) return;

		await menu.execute(client, interaction);
	}
}
