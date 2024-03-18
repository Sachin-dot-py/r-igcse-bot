import { Punishment } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
	Colors,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder
} from "discord.js";

export default class HistoryCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("history")
				.setDescription("Check a user's previous offenses (for mods)")
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User to view history of")
						.setRequired(true)
				)
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ModerateMembers
				)
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const user = interaction.options.getUser("user", true);

		const punishments = await Punishment.find({
			guildId: interaction.guildId,
			actionAgainst: user.id
		}).exec();

		if (punishments.length < 1) {
			await interaction.reply({
				content: `${user.displayName} does not have any previous offenses.`,
				ephemeral: true
			});

			return;
		}

		const embed = new EmbedBuilder()
			.setAuthor({
				name: `Moderation History for ${user.displayName}`,
				iconURL: user.displayAvatarURL()
			})
			.setColor(Colors.DarkOrange)
			.setDescription(`\`\`\`No. of Offences (${punishments.length}):
				${["Warn", "Kick", "Ban", "Unban", "Remove Timeout", "Timeout"].map((action) => `${action}: ${punishments.filter((punishment) => punishment.action === action)}\n`)}---
				Total Points: ${((points: number) => `${points}${points >= 10 ? ` (Action Needed)` : ""}`)(punishments.reduce((prev, next) => prev + next.points, 0))}
				${punishments.map((punishment) => `[${punishment.when}] [${punishment.points > 0 ? "+" : ""}${punishment.points}] ${punishment.action} ${punishment.reason ? `for ${punishment.reason}` : ""} by ${punishment.actionBy}`)}
			\`\`\``);

		await interaction.reply({
			embeds: [embed]
		});
	}
}
