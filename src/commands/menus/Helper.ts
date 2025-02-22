import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordMessageContextMenuCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	ContextMenuCommandBuilder,
	EmbedBuilder,
	PermissionFlagsBits,
} from "discord.js";

export default class HelperMenu extends BaseCommand {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("Helper Ping")
				.setType(ApplicationCommandType.Message)
				.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordMessageContextMenuCommandInteraction<"cached">,
	) {
		if (!interaction.channel) return;

		const studyChannel = await StudyChannel.findOne({
			guildId: interaction.guildId,
			channelId: interaction.channelId,
		});

		if (!studyChannel) {
			interaction.reply({
				content: "No helper for this channel",
				ephemeral: true,
			});

			return;
		}

		const role = interaction.guild.roles.cache.get(
			studyChannel.helperRoleId,
		);

		if (!role) {
			interaction.reply({
				content:
					"Invalid configuration for this channel's helper role. Please contact an admin.",
				ephemeral: true,
			});

			return;
		}

		interaction.reply({
			content: "https://tenor.com/Wta8.gif",
			ephemeral: true,
		});

		const boosterRole = await interaction.guild.roles.cache.find(
			(role) => role.name === "Server Booster",
		);
		if (boosterRole && interaction.member.roles.cache.has(boosterRole.id)) {
			const embed = new EmbedBuilder()
				.setDescription(
					`[Jump to the message.](${interaction.targetMessage.url})`,
				)
				.setAuthor({
					name: interaction.user.tag,
					iconURL: interaction.user.displayAvatarURL(),
				});

			interaction.channel.send({
				content: role.toString(),
				embeds: [embed],
			});

			return;
		}

		const embed = new EmbedBuilder()
			.setDescription(
				`The helper role(s) for this channel (${role}) will automatically be pinged (<t:${Math.floor(Date.now() / 1000) + 890}:R>).\nIf your query has been resolved by then, please click on the \`Cancel Ping\` button.`,
			)
			.setAuthor({
				name: interaction.user.tag,
				iconURL: interaction.user.displayAvatarURL(),
			});

		const cancelButton = new ButtonBuilder()
			.setCustomId("cancel_ping")
			.setLabel("Cancel Ping")
			.setStyle(ButtonStyle.Danger);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			cancelButton,
		);

		const pingMessage = await interaction.targetMessage.reply({
			embeds: [embed],
			components: [row],
		});

		let canceled = false;

		const collector = interaction.channel.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 890000,
			filter: (i) => i.customId === "cancel_ping",
		});

		collector.on("collect", (i) => {
			i.deferUpdate();

			const member = interaction.guild.members.cache.get(i.user.id);

			if (
				member &&
				(i.user.id === interaction.user.id ||
					member.permissions.has(
						PermissionFlagsBits.ModerateMembers,
					) ||
					member.roles.cache.has(role.id))
			) {
				canceled = true;

				pingMessage.edit({
					content: `Ping cancelled by ${i.user.tag}`,
					components: [],
					embeds: [],
				});

				return;
			}

			i.followUp({
				content: `You don't have the neccessary permissions to do this action.`,
				ephemeral: true,
			});
		});

		collector.on("end", () => {
			if (canceled || !interaction.channel) return;

			pingMessage.delete();

			const embed = new EmbedBuilder()
				.setDescription(
					`[Jump to the message.](${interaction.targetMessage.url})`,
				)
				.setAuthor({
					name: interaction.user.tag,
					iconURL: interaction.user.displayAvatarURL(),
				});

			interaction.channel.send({
				content: role.toString(),
				embeds: [embed],
			});
		});
	}
}
