import { GuildPreferencesCache, ModPingCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordMessageContextMenuCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	SlashCommandBuilder,
	EmbedBuilder,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";

export default class ModPingCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("mod_ping")
				.setDescription(
					"ping the moderators (use only for important cases)",
				)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordMessageContextMenuCommandInteraction<"cached">,
	) {
		const userPingHistory = await ModPingCache.get(
			interaction.guildId,
			interaction.user.id,
		);

		if (
			userPingHistory &&
			userPingHistory.when.getTime() > Date.now() - 86400000
		) {
			interaction.reply({
				content: `You may only ping moderators again <t:${Math.floor(userPingHistory.when.getTime() / 1000) + 3600}:R>`,
				ephemeral: true,
			});
			return;
		}

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);

		if (!guildPreferences || !guildPreferences.moderatorRoleId) {
			interaction.reply({
				content:
					"Please setup the bot using the command `/setup` first.",
				ephemeral: true,
			});
			return;
		}

		const embed = new EmbedBuilder()
			.setAuthor({
				name: interaction.user.tag,
				iconURL: interaction.user.displayAvatarURL(),
			})
			.setTitle("Ping Moderators")
			.setDescription(
				"This command allows you to ping **all** moderators. Please only use this command if there's an emergency, including but not limited to:\n- raids\n- user leaks paper/ask for leaks\n- user violating ToS\n- etc.\nMisusing or abusing this command can result to an infraction (rule 6). Are you sure you want to perform this action?",
			);

		const confirmButton = new ButtonBuilder()
			.setCustomId("confirm_ping")
			.setLabel("Confirm Ping")
			.setStyle(ButtonStyle.Success);

		const cancelButton = new ButtonBuilder()
			.setCustomId("cancel_ping")
			.setLabel("Cancel Ping")
			.setStyle(ButtonStyle.Danger);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			confirmButton,
			cancelButton,
		);

		await interaction.reply({
			embeds: [embed],
			components: [row],
			ephemeral: true,
		});

		if (!interaction.channel) return;

		const customId = uuidv4();

		const collector = interaction.channel.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 120000,
			filter: (i) => i.user.id === interaction.user.id &&
				(i.customId === `cancel_ping_${customId}` || i.customId === `confirm_ping_${customId}`),
		});

		collector.on("collect", async (i) => {
			if (!interaction.channel) return;

			i.deferUpdate();

			if (i.customId === `cancel_ping_${customId}`) {
				ModPingCache.set(customId, {
					userId: interaction.user.id,
					guildId: interaction.guildId,
					when: new Date(),
				});

				ModPingCache.expire(customId, 3600); // expire in an hour

				await GuildPreferencesCache.remove(interaction.guildId);

				await interaction.editReply({
					content: "Moderators Pinged.",
					components: [],
					embeds: [],
				});

				await interaction.followUp({
					content: `<@&${guildPreferences.moderatorRoleId}>, you were pinged by <@${interaction.user.id}>`,
				});

				return;
			}

			await interaction.editReply({
				content: "You have cancelled the ping.",
				components: [],
				embeds: [],
			});

			return;
		});
	}
}
