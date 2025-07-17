import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { logToChannel } from "@/utils/Logger";
import {
	Colors,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	MessageFlags,
} from "discord.js";

export default class EditCaseCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("reason")
				.setDescription("Change the reason of a case")
				.addStringOption((option) =>
					option
						.setName("case")
						.setDescription("Case number you want to change")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("reason")
						.setDescription("The new reason")
						.setRequired(true),
				)
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ModerateMembers,
				)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel || !interaction.channel.isTextBased()) return;

		const caseId = interaction.options.getString("case", true);
		const reason = interaction.options.getString("reason", true);

		await interaction.deferReply({
			flags: MessageFlags.Ephemeral,
		});

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);

		if (!guildPreferences) {
			interaction.editReply({
				content:
					"Please setup the bot using the command `/setup` first.",
			});
			return;
		}

		const caseToUpdate = await Punishment.findOne({
			guildId: interaction.guildId,
			caseId,
		});

		if (!caseToUpdate) {
			await interaction.editReply({
				content: "Case not found.",
			});
			return;
		}

		Punishment.updateOne(
			{
				guildId: interaction.guildId,
				caseId,
			},
			{
				reason,
			},
		);

		if (guildPreferences.modlogChannelId) {
			const modEmbed = new EmbedBuilder()
				.setTitle(`Case Edit | Case #${caseToUpdate.caseId}`)
				.setColor(Colors.Red)
				.addFields([
					{
						name: "Moderator",
						value: `${interaction.user.tag} (${interaction.user.id})`,
						inline: false,
					},
					{
						name: "Old Reason",
						value: caseToUpdate.reason,
					},
					{
						name: "New Reason",
						value: reason,
					},
				])
				.setTimestamp();

			logToChannel(interaction.guild, guildPreferences.modlogChannelId, {
				embeds: [modEmbed],
			});
		}

		interaction.editReply({
			content:
				"https://tenor.com/view/it%27s-done-ray-johnson-kingdom-business-it%27s-finished-bet-networks-gif-108352521834961872",
		});

		interaction.channel.send(
			`Case #${caseToUpdate.caseId} has been updated with new reason ${reason}.`,
		);
	}
}
