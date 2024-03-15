import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Colors,
	ComponentType,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "../../registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";
import { GuildPreferencesCache } from "@/redis";

export default class FunFactCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("confess")
				.setDescription("Make an anonymous confession")
				.addStringOption((option) =>
					option
						.setName("confession")
						.setDescription(
							"Write your confession and it will be sent anonymously",
						)
						.setRequired(true),
				),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const confession = interaction.options.getString("confession", true);

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);

		const approvalChannel = interaction.guild.channels.cache.get(
			guildPreferences.confessionApprovalChannelId,
		);

		if (!approvalChannel || !approvalChannel.isTextBased()) {
			await interaction.reply({
				content: "Confessions not configured",
				ephemeral: true,
			});

			return;
		}

		const embed = new EmbedBuilder()
			.setDescription(confession)
			.setColor("Random");

		const approveButton = new ButtonBuilder()
			.setLabel("Approve")
			.setStyle(ButtonStyle.Success)
			.setCustomId("approve-confession");

		const rejectButton = new ButtonBuilder()
			.setLabel("Reject")
			.setStyle(ButtonStyle.Danger)
			.setCustomId("reject-confession");

		const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			approveButton,
			rejectButton,
		);

		const message = await approvalChannel.send({
			embeds: [embed],
			components: [buttonsRow],
		});

		await interaction.reply({
			content:
				"Your confession has been sent to the moderators.\nYou have to wait for their approval.",
			ephemeral: true,
		});

		message
			.awaitMessageComponent({
				filter: (i) =>
					i.customId === "approve-confession" ||
					i.customId === "reject-confession",
				componentType: ComponentType.Button,
			})
			.then(async (i) => {
				switch (i.customId) {
					case "approve-confession": {
						const confessionChannel = interaction.guild.channels.cache.get(
							guildPreferences.confessionsChannelId,
						);

						if (!confessionChannel || !confessionChannel.isTextBased()) {
							await i.reply({
								content: "Confessions not configured",

								ephemeral: true,
							});

							return;
						}

						const approvalEmbed = new EmbedBuilder()
							.setAuthor({
								name: `Approved by ${i.user.displayName}`,
								iconURL: i.user.displayAvatarURL(),
							})
							.setColor(Colors.Green);

						message.edit({
							embeds: [approvalEmbed],
							components: [],
						});

						break;
					}
					case "reject-confession": {
						const rejectionEmbed = new EmbedBuilder()
							.setAuthor({
								name: `Rejected by ${i.user.displayName}`,
								iconURL: i.user.displayAvatarURL(),
							})
							.setColor(Colors.Red);

						message.edit({
							embeds: [rejectionEmbed],
							components: [],
						});

						break;
					}

					default:
						break;
				}
			});
	}
}
