import { HOTM } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import { SlashCommandBuilder } from "discord.js";

export default class HOTMVotingCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("vote_hotm")
				.setDescription("Vote for the helper of the month")
				.addUserOption((option) =>
					option
						.setName("helper")
						.setDescription("Choose the helper to vote for")
						.setRequired(true),
				)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const helper = interaction.options.getUser("helper", true);

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guild.id,
		);

		if (!guildPreferences) {
			await interaction.reply({
				content: "This feature hasn't been configured.",
			});

			return;
		}

		const helperRoles = interaction.guild.roles.cache.filter((role) =>
			guildPreferences.helperRoles.some(
				(helperRole) => helperRole.roleId === role.id,
			),
		);

		if (helperRoles.size < 1) {
			await interaction.reply({
				content: "Helper roles not found",
				ephemeral: true,
			});

			if (guildPreferences.botlogChannelId)
				await Logger.channel(
					interaction.guild,
					guildPreferences.botlogChannelId,
					{
						content: "Helper role not found",
					},
				);

			return;
		}

		if (!helperRoles.some((role) => role.members.has(helper.id))) {
			await interaction.reply({
				content: `${helper.displayName} is not a helper`,
				ephemeral: true,
			});

			return;
		}

		const hotm = await HOTM.updateOne(
			{ guildId: interaction.guild.id, helperId: helper.id },
			{ $addToSet: { voters: interaction.user.id } },
			{ upsert: true },
		).exec();

		if (hotm.modifiedCount < 1) {
			await interaction.reply({
				content: `You already voted for ${helper.displayName}`,
				ephemeral: true,
			});

			return;
		}

		await interaction.reply({
			content: `You voted for ${helper.displayName}`,
			ephemeral: true,
		});
	}
}
