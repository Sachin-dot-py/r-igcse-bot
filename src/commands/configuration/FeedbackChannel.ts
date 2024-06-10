import Select from "@/components/Select";
import Buttons from "@/components/practice/views/Buttons";
import { FeedbackChannels } from "@/mongo/schemas/FeedbackChannel";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	type ButtonBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";

export default class FeedbackChannelCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("feedback_channel")
				.setDescription("Modify feedback channels (for mods)")
				.addSubcommand((subcommand) =>
					subcommand
						.setName("add")
						.setDescription("Add a feedback channel")
						.addChannelOption((option) =>
							option
								.setName("channel")
								.setDescription(
									"The channel to send feedback to",
								)
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("team_label")
								.setDescription("The team receiving feedback")
								.setRequired(true),
						),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("remove")
						.setDescription("Remove a feedback channel"),
				)
				.setDMPermission(false)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		switch (interaction.options.getSubcommand()) {
			case "add": {
				const channel = interaction.options.getChannel("channel", true);
				const label = interaction.options.getString("team_label", true);

				if (!channel.isTextBased()) {
					interaction.reply({
						content:
							"Feedback channel must be a valid text channel.",
						ephemeral: true,
					});
					return;
				}

				if (label === "Bot Developers") {
					interaction.reply({
						content: "Label cannot be `Bot Developers`",
						ephemeral: true,
					});
					return;
				}

				await interaction.deferReply({
					ephemeral: true,
				});

				try {
					const addChannel = await FeedbackChannels.updateOne(
						{
							guildId: interaction.guildId,
							label: label,
						},
						{
							channelId: channel.id,
						},
						{ upsert: true },
					);

					if (addChannel.upsertedCount > 0) {
						await interaction.editReply({
							content: `Successfully added ${channel} as the feedback channel for ${label}!`,
						});
					} else if (addChannel.modifiedCount > 0) {
						await interaction.editReply({
							content: `Successfully updated ${channel} as the feedback channel for ${label}`,
						});
					} else {
						await interaction.editReply({
							content: `Error occured while creating feedback channel ${channel} for ${label}. Please try again later.`,
						});
					}
				} catch (error) {
					interaction.editReply({
						content: `Encountered error while trying to add ${channel} as a feedback channel for ${label}. Please try again later.`,
					});

					client.log(
						error,
						`${this.data.name} Command - Add Feedback Channel`,
						`**Channel:** <#${interaction.channel?.id}>
**User:** <@${interaction.user.id}>
**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
					);
				}
				break;
			}
			case "remove": {
				const feedbackTeams = await FeedbackChannels.find({
					guildId: interaction.guildId,
				});

				if (feedbackTeams.length == 0) {
					interaction.reply({
						content: "There are no feedback channels to be removed",
						ephemeral: true,
					});
					return;
				}

				const customId = uuidv4();

				const teamSelect = new Select(
					"team",
					"Select a team to stop sending feedback to",
					feedbackTeams.map(({ label, channelId, id }) => ({
						label: `${label} | #${interaction.guild.channels.cache.get(channelId)?.name}`,
						value: id,
					})),
					1,
					`${customId}_0`,
				);

				const selectInteraction = await interaction.reply({
					content: "Select a team to remove from feedback",
					components: [
						new ActionRowBuilder<Select>().addComponents(
							teamSelect,
						),
						new Buttons(
							customId,
						) as ActionRowBuilder<ButtonBuilder>,
					],
					fetchReply: true,
					ephemeral: true,
				});

				const response = await teamSelect.waitForResponse(
					`${customId}_0`,
					selectInteraction,
					interaction,
					true,
				);

				if (!response || response === "Timed out" || !response[0]) {
					interaction.followUp({
						content: "An error occurred",
						ephemeral: false,
					});
					return;
				}

				const team = await FeedbackChannels.findById(response[0]);

				if (!team) {
					interaction.followUp({
						content: "Team not found",
						ephemeral: true,
					});
					return;
				}

				try {
					await team.deleteOne();
					interaction.editReply({
						content: `Successfully removed feedback for ${team.label}!`,
						components: [],
					});
				} catch (error) {
					interaction.editReply({
						content:
							"Encountered error while trying to delete feedback channel. Please try again later.",
					});

					client.log(
						error,
						`${this.data.name} Command - Remove Feedback Channel`,
						`**Channel:** <#${interaction.channel?.id}>
							**User:** <@${interaction.user.id}>
							**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
					);
				}
				break;
			}
			default:
				break;
		}
	}
}
