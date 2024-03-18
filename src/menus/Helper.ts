import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseMenu, {
	type DiscordMessageContextMenuCommandInteraction
} from "@/registry/Structure/BaseMenu";
import {
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	ContextMenuCommandBuilder,
	EmbedBuilder,
	PermissionFlagsBits,
	Role
} from "discord.js";

export default class HelperMenu extends BaseMenu {
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

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId
		);

		if (!guildPreferences) {
			await interaction.reply({
				content:
					"Please setup the bot using the command `/set_preferences` first.",
				ephemeral: true
			});
			return;
		}

		const helperData = guildPreferences.helperRoles;

		if (!helperData || helperData.length < 1) {
			await interaction.reply({
				content: "No helper roles set for this server",
				ephemeral: true
			});

			return;
		}

		const rolesData = helperData.filter(
			(data) => data.channelId === interaction.channelId
		);

		if (!rolesData || rolesData.length < 1) {
			await interaction.reply({
				content: "No helpers for this channel",
				ephemeral: true
			});

			return;
		}

		const roles = rolesData
			.map(({ roleId }) => interaction.guild.roles.cache.get(roleId))
			.filter((role) => role !== undefined) as Role[];

		if (roles.length < 1) {
			await interaction.reply({
				content: "No helper for this channel",
				ephemeral: true
			});

			return;
		}

		const embed = new EmbedBuilder()
			.setDescription(
				`The helper role(s) for this channel (${roles
					.map((role) => `\`@${role.name}\``)
					.join(
						", "
					)}) will automatically be pinged (<t:${Date.now() + 890}:R>).\nIf your query has been resolved by then, please click on the \`Cancel Ping\` button.`
			)
			.setAuthor({
				name: interaction.user.displayName,
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
				content: `Ping cancelled by ${i.user.displayName}`
			});
		});

		collector.on("end", async () => {
			if (!interaction.channel) return;

			const embed = new EmbedBuilder()
				.setDescription(
					`[Jump to the message.](${interaction.targetMessage.url})`
				)
				.setAuthor({
					name: interaction.user.displayName,
					iconURL: interaction.user.displayAvatarURL()
				});

			await interaction.channel.send({
				content: `${roles.map((role) => `\`@${role.id}\``).join(" ")}`,
				embeds: [embed]
			});

			await interaction.deleteReply();
		});
	}
}
