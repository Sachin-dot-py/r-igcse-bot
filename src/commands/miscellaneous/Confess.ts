import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Colors,
	ComponentType,
	EmbedBuilder,
	SlashCommandBuilder
} from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";
import { ButtonInteractionCache, GuildPreferencesCache } from "@/redis";
import { v4 as uuidv4 } from "uuid";
import { ConfessionBan } from "@/mongo";

interface IBannedData {
	_id: string;
	bannedUsers: string[];
};

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
							"Write your confession and it will be sent anonymously"
						)
						.setRequired(true)
				)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const confession = interaction.options.getString("confession", true);

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId
		);

		if (
			!guildPreferences ||
			!guildPreferences.confessionApprovalChannelId ||
			!guildPreferences.confessionsChannelId
		) {
			await interaction.reply({
				content:
					"Please setup the bot using the command `/set_preferences` first.",
				ephemeral: true
			});

			return;
		}

		const approvalChannel = interaction.guild.channels.cache.get(
			guildPreferences.confessionApprovalChannelId
		);

		if (!approvalChannel || !approvalChannel.isTextBased()) {
			await interaction.reply({
				content:
					"Invalid configuration for confessions. Please contact an admin.",
				ephemeral: true
			});

			return;
		}

		const bannedQuery: IBannedData[] | null = await ConfessionBan.aggregate([
			{
				$match: {
					guildId: interaction.guild.id
				}
			},
			{
				$group: {
					_id: "$guildId",
					bannedUsers: {
						$push: "$userHash"
					}
				}
			}
		]) ?? null;

		const bannedUsers = bannedQuery[0]?.bannedUsers || [];

		for (const userHash of bannedUsers) {
			if (await Bun.password.verify(interaction.user.id, userHash)) {
				await interaction.reply({
					content:
						"You have been banned from making confessions in this server.",
					ephemeral: true
				});

				return;
			}
		}

		const embed = new EmbedBuilder()
			.setDescription(confession)
			.setColor("Random");

		const customId = uuidv4();

		const approveButton = new ButtonBuilder()
			.setLabel("Approve")
			.setStyle(ButtonStyle.Primary)
			.setCustomId(`${customId}_confession_accept`);

		const rejectButton = new ButtonBuilder()
			.setLabel("Reject")
			.setStyle(ButtonStyle.Secondary)
			.setCustomId(`${customId}_confession_reject`);

		const banButton = new ButtonBuilder()
			.setLabel("Ban")
			.setStyle(ButtonStyle.Danger)
			.setCustomId(`${customId}_confession_ban`);

		const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			approveButton,
			rejectButton,
			banButton
		);

		const message = await approvalChannel.send({
			embeds: [embed],
			components: [buttonsRow]
		});

		await interaction.reply({
			content:
				"Your confession has been sent to the moderators.\nYou have to wait for their approval.",
			ephemeral: true
		});

		await ButtonInteractionCache.set(`${customId}_confession`, {
			customId: `${customId}_confession`,
			messageId: message.id,
			guildId: interaction.guild.id,
			userHash: await Bun.password.hash(interaction.user.id)
		});
		// Interaction will be handled in the InteractionCreate event and is stored in redis (@/events/InteractionCreate.ts)
	}
}
