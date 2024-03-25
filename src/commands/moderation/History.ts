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
		}).sort({ when: 1 });

		if (punishments.length < 1) {
			await interaction.reply({
				content: `${user.tag} does not have any previous offenses.`,
				ephemeral: true
			});
			return;
		}

		const counts = {
			Warn: 0,
			Timeout: 0,
			Kick: 0,
			Ban: 0
		};

		let totalPoints = 0;
		let offenceCount = 0;

		const punishmentsList = [];

		for (const { when, actionBy, points, action, reason } of punishments) {
			if (points) totalPoints += points;

			if (action in counts) {
				counts[action as keyof typeof counts]++;
				offenceCount++;
			}

			const moderator =
				interaction.guild.members.cache.get(actionBy)?.user.tag ??
				actionBy;

			punishmentsList.push(
				`[${when.toLocaleDateString("en-GB")} at ${when.toLocaleTimeString("en-GB", { hour12: true, hour: '2-digit', minute: '2-digit' })}] ${action}${points !== 0 ? ` [${points}]` : ""}${reason ? ` for ${reason}` : ""} by ${moderator}`
			);
		}

		let description = `**Number of offenses:** ${offenceCount}\n\n`;

		description += Object.entries(counts)
			.map(([action, count]) => `- **${action}s:** ${count}`)
			.join("\n");

		description += `\n\n**Total points:** ${totalPoints}\n\n`;
		description += "```";
		description += punishmentsList.join("\n");
		description += "```";

		const embed = new EmbedBuilder()
			.setTitle(`Moderation History for ${user.tag}`)
			.setAuthor({
				name: user.username,
				iconURL: user.displayAvatarURL()
			})
			.setColor(Colors.DarkOrange)
			.setDescription(description);

		await interaction.reply({
			embeds: [embed]
		});
	}
}
