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
		}).sort({ when: 1 })

		if (punishments.length < 1) {
			await interaction.reply({
				content: `${user.displayName} does not have any previous offenses.`,
				ephemeral: true
			});
			return;
		}

		const filteredPunishments = punishments.filter((p) => ["Warn", "Timeout", "Kick", "Ban"].includes(p.action));
		const counts = {
			Warn: 0,
			Timeout: 0,
			Kick: 0,
			Ban: 0
		};
		const totalPoints = punishments.reduce((acc, p) => acc + p.points, 0);
		const mappedPunishments = []

		for (const { when, actionBy, points, action, reason } of punishments) {
			const moderator = interaction.guild.members.cache.get(actionBy)?.user.tag ?? actionBy;
			mappedPunishments.push(`[${when.toLocaleDateString("en-GB")}] ${action} [${points}] ${reason && `for ${reason} `}by ${moderator}`)
			if (action in counts) {
				counts[action as "Warn" | "Timeout" | "Kick" | "Ban"]++;
			}
		}

		let description = `Number of offenses: ${filteredPunishments.length}\n`;
		description += Object.entries(counts).map(([action, count]) => `- ${action}s: ${count}`).join("\n");
		description += `\n\nTotal points: ${totalPoints}\n\n`;
		description += "```";
		description += mappedPunishments.join("\n");
		description += "```";

		const embed = new EmbedBuilder()
			.setAuthor({
				name: `Moderation History for ${user.displayName}`,
				iconURL: user.displayAvatarURL()
			})
			.setColor(Colors.DarkOrange)
			.setDescription(`${description}`);

		await interaction.reply({
			embeds: [embed]
		});
	}
}
