import { GuildPreferencesCache, ModPingCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordMessageContextMenuCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { logToChannel } from "@/utils/Logger";
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
			`${interaction.user.id}-${interaction.guildId}`,
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

		if (!guildPreferences?.moderatorRoleId) {
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

		const buttonCustomId = uuidv4();

		const confirmButton = new ButtonBuilder()
			.setCustomId(`confirm_${buttonCustomId}`)
			.setLabel("Confirm Ping")
			.setStyle(ButtonStyle.Success);

		const cancelButton = new ButtonBuilder()
			.setCustomId(`cancel_${buttonCustomId}`)
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

		if (!interaction.channel) {
			return;
		}

		const buttonResponse = await interaction.channel.awaitMessageComponent({
			filter: (i) => {
				i.deferUpdate();
				return (
					i.customId === `confirm_${buttonCustomId}` ||
					i.customId === `cancel_${buttonCustomId}`
				);
			},
			time: 300_000,
			componentType: ComponentType.Button,
		});

		if (buttonResponse.customId === `confirm_${buttonCustomId}`) {
			const userPingHistory = await ModPingCache.get(
				`${interaction.user.id}-${interaction.guildId}`,
			);

			if (
				userPingHistory &&
				userPingHistory.when.getTime() > Date.now() - 86400000
			) {
				interaction.editReply({
					content: `You may only ping moderators again <t:${Math.floor(userPingHistory.when.getTime() / 1000) + 3600}:R>[,](https://tenor.com/view/fat-boohoo-cry-baby-gif-10647085) nice try though`,
					embeds: [],
					components: [],
				});
				return;
			}

			if (guildPreferences.generalLogsChannelId) {
				const channel = interaction.guild.channels.cache.get(
					guildPreferences.generalLogsChannelId,
				);

				if (channel?.isTextBased()) {
					logToChannel(
						interaction.guild,
						guildPreferences.generalLogsChannelId,
						{
							embeds: [
								new EmbedBuilder()
									.setTitle("Moderators Pinged")
									.setDescription(
										`Moderators were pinged in <#${interaction.channelId}> by <@${interaction.user.id}>`,
									)
									.setColor("Red")
									.setTimestamp(),
							],
							allowedMentions: { repliedUser: false },
						},
					);
				}
			}

			ModPingCache.set(`${interaction.user.id}-${interaction.guildId}`, {
				userId: interaction.user.id,
				guildId: interaction.guildId,
				when: new Date(),
			});

			ModPingCache.expire(buttonCustomId, 3600); // expire in an hour

			await interaction.editReply({
				content: "Moderators Pinged.",
				components: [],
				embeds: [],
			});

			await interaction.channel.send({
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
	}
}
