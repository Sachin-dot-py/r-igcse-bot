import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordMessageContextMenuCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	ContextMenuCommandBuilder,
	EmbedBuilder,
	PermissionFlagsBits
} from "discord.js";

export default class HelperMenu extends BaseCommand {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("helper")
				.setType(ApplicationCommandType.Message)
				.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordMessageContextMenuCommandInteraction<"cached">
	) {
		if (!interaction.channel) return;

		const studyChannel = await StudyChannel.findOne({
			guildId: interaction.guildId,
			channelId: interaction.channelId
		});

		if (!studyChannel) {
			await interaction.reply({
				content: "No helper for this channel",
				ephemeral: true
			});

			return;
		}

		const role = await interaction.guild.roles.cache.get(
			studyChannel.helperRoleId
		);

		if (!role) {
			await interaction.reply({
				content:
					"Invalid configuration for this channel's helper role. Please contact an admin.",
				ephemeral: true
			});

			return;
		}

		const embed = new EmbedBuilder()
			.setDescription(
				`The helper role(s) for this channel (@${role.name}) will automatically be pinged (<t:${Date.now() + 890}:R>).\nIf your query has been resolved by then, please click on the \`Cancel Ping\` button.`
			)
			.setAuthor({
				name: interaction.user.tag,
				iconURL: interaction.user.displayAvatarURL()
			});

		const cancelButton = new ButtonBuilder()
			.setCustomId("cancel_ping")
			.setLabel("Cancel Ping")
			.setStyle(ButtonStyle.Danger);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			cancelButton
		);

		await interaction.channel.send({
			embeds: [embed],
			components: [row]
		});

		const collector = interaction.channel.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 890,
			filter: (i) =>
				i.user.id === interaction.user.id ||
				i.memberPermissions.has(PermissionFlagsBits.ModerateMembers)
		});

		collector.on("collect", async (i) => {
			if (!(i.customId === "cancel_ping")) return;
			interaction.editReply({
				content: `Ping cancelled by ${i.user.tag}`
			});
		});

		collector.on("end", async () => {
			if (!interaction.channel) return;

			const embed = new EmbedBuilder()
				.setDescription(
					`[Jump to the message.](${interaction.targetMessage.url})`
				)
				.setAuthor({
					name: interaction.user.tag,
					iconURL: interaction.user.displayAvatarURL()
				});

			await interaction.channel.send({
				content: `@<${role.id}>`,
				embeds: [embed]
			});

			await interaction.deleteReply();
		});
	}
}
