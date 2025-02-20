import { OldPinsThread } from "@/mongo/schemas/OldPinsThread";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class OldPinsThreadCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("old_pins_thread")
				.setDescription("Manage Old Pins threads for channels")
				.addSubcommand((command) =>
					command
						.setName("set")
						.setDescription("Set Old Pins thread")
						.addChannelOption((option) =>
							option
								.setName("channel")
								.setDescription("Channel to link")
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("thread_id")
								.setDescription("ID of the Old Pins thread")
								.setRequired(true),
						),
				)
				.addSubcommand((command) =>
					command
						.setName("remove")
						.setDescription("Remove a keyword")
						.addChannelOption((option) =>
							option
								.setName("channel")
								.setDescription("Channel to unlink")
								.setRequired(true),
						),
				)
				.setDMPermission(false)
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ManageChannels,
				),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const channel = interaction.options.getChannel("channel", true);
		const threadId = interaction.options.getString("thread_id", true);
		if (interaction.options.getSubcommand() === "set") {
			const res = await OldPinsThread.updateOne(
				{ channelId: channel.id },
				{ channelId: channel.id, oldPinsThreadId: threadId },
				{ upsert: true },
			);

			if (res.modifiedCount + res.upsertedCount < 1) {
				if (res.matchedCount) {
					await interaction.reply({
						content: "The thread has already been set.",
						ephemeral: true,
					});
				} else {
					await interaction.reply({
						content:
							"Error occured while setting thread. Please try again later.",
						ephemeral: true,
					});
				}

				return;
			}

			await interaction.reply({
				content: `Successfully set Old Pins thread for <#${channel.id}>`,
				ephemeral: true,
			});
		} else if (interaction.options.getSubcommand() === "remove") {
			const channel = interaction.options.getChannel("channel", true);

			const res = await OldPinsThread.deleteOne({
				channelId: channel.id,
			});

			if (res.deletedCount < 1) {
				await interaction.reply({
					content:
						"Error occured while removing thread. Please try again later.",
					ephemeral: true,
				});

				return;
			}

			await interaction.reply({
				content: `Successfully removed Old Pins thread for <#${channel.id}>.`,
				ephemeral: true,
			});
		}
	}
}
