import BaseMenu from "@/registry/Structure/BaseMenu";
import type { DiscordClient } from "@/registry/client";
import {
	ActionRowBuilder,
	ApplicationCommandType,
	ChannelSelectMenuBuilder,
	ChannelType,
	ContextMenuCommandBuilder,
	ContextMenuCommandInteraction,
	PermissionFlagsBits,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	type MessageActionRowComponentBuilder,
} from "discord.js";

export default class StickMessageMenu extends BaseMenu {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("Stick Message")
				.setType(ApplicationCommandType.Message)
				// .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false),
		);
	}

	// TODO: Stick Context Menu
	async execute(
		interaction: ContextMenuCommandInteraction,
		client: DiscordClient,
	) {
		if (!interaction.isMessageContextMenuCommand() || !interaction.inGuild())
			return;

		const embeds = interaction.targetMessage.embeds;

		if (embeds.length < 1) {
			interaction.reply({
				content: "This message does not have any embeds.",
				ephemeral: true,
			});
			return;
		}

		const embed = embeds[0];

		const channelSelect = new ChannelSelectMenuBuilder()
			.setCustomId("stick_channel")
			.setPlaceholder("Select a channel")
			.addChannelTypes(ChannelType.GuildText);

		const timeSelect = new StringSelectMenuBuilder()
			.setCustomId("stick_time")
			.setPlaceholder("Select a time")
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel("Stick Time")
					.setDescription("Message Auto-Stick Time (Epoch)"),
				new StringSelectMenuOptionBuilder()
					.setLabel("Untick Time")
					.setDescription("Message Auto-Unstick Time (Epoch)"),
			);

		const component =
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				timeSelect,
				channelSelect,
			);

		await interaction.reply({
			content: "Do this dummy:",
			components: [component],
		});
	}
}
