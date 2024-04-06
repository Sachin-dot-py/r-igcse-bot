import { Keyword } from "@/mongo/schemas/Keyword";
import { KeywordCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class KeywordCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("keyword")
				.setDescription("Create / Delete keywords for a server")
				.addSubcommand((command) =>
					command
						.setName("add")
						.setDescription("Add a keyword")
						.addStringOption((option) =>
							option
								.setName("keyword")
								.setDescription("Name of the keyword")
								.setRequired(true)
						)
						.addStringOption((option) =>
							option
								.setName("response")
								.setDescription("Response to the keyword")
								.setRequired(true)
						)
				)
				.addSubcommand((command) =>
					command
						.setName("remove")
						.setDescription("Remove a keyword")
						.addStringOption((option) =>
							option
								.setName("keyword")
								.setDescription("Keyword to remove")
								.setRequired(true)
						)
				)
				.setDMPermission(false)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		if (interaction.options.getSubcommand() === "add") {
			const keyword = interaction.options.getString("keyword", true);
			const response = interaction.options.getString("response", true);

			const res = await Keyword.updateOne(
				{
					guildId: interaction.guildId,
					keyword
				},
				{
					response
				},
				{
					upsert: true
				}
			);

			if (res.modifiedCount + res.upsertedCount < 1) {
				await interaction.reply({
					content:
						"Error occured while creating keyword. Please try again later.",
					ephemeral: true
				});

				return;
			}

			await interaction.reply({
				content: `Successfully created keyword ${keyword}`,
				ephemeral: true
			});

			await KeywordCache.append({
				guildId: interaction.guildId,
				keyword,
				response
			});
		} else if (interaction.options.getSubcommand() === "remove") {
			const keyword = interaction.options.getString("keyword", true);

			const res = await Keyword.deleteOne({
				guildId: interaction.guildId,
				keyword
			});

			if (res.deletedCount < 1) {
				await interaction.reply({
					content:
						"Error occured while deleting keyword. Please try again later.",
					ephemeral: true
				});

				return;
			}

			await interaction.reply({
				content: `Successfully deleted \`${keyword}\`.`,
				ephemeral: true
			});

			await KeywordCache.delete(interaction.guildId, keyword);
		}
	}
}
