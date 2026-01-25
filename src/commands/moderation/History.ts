import { Punishment } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	Colors,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import humanizeDuration from "humanize-duration";

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
						.setRequired(true),
				)
				.addBooleanOption((option) =>
					option
						.setName("show_mod_username")
						.setDescription(
							"Show the usernames of the mod (default: false).",
						)
						.setRequired(false),
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
		const user = interaction.options.getUser("user", true);
		const showUsername =
			interaction.options.getBoolean("show_mod_username", false) ?? false;

		await interaction.deferReply();

		const punishments = await Punishment.find({
			guildId: interaction.guildId,
			actionAgainst: user.id,
		}).sort({ when: 1 });

		if (punishments.length < 1) {
			await interaction.editReply({
				content: `${user.tag} does not have any previous offenses.`,
			});
			return;
		}

		const counts = {
			Warn: 0,
			Timeout: 0,
			Kick: 0,
			Ban: 0,
		};

		let totalPoints = 0;
		let offenceCount = 0;

		const punishmentsList = [];

		for (const {
			when,
			actionBy,
			points,
			action,
			reason,
			duration,
			caseId,
		} of punishments) {
			if (points) totalPoints += points;

			if (action in counts) {
				counts[action as keyof typeof counts]++;
				offenceCount++;
			}

			const moderator =
				interaction.guild.members.cache.get(actionBy)?.user.tag ??
				actionBy;

			const date = when.toLocaleDateString("en-GB");
			const time = when.toLocaleTimeString("en-GB", {
				hour12: true,
				hour: "2-digit",
				minute: "2-digit",
			});

			punishmentsList.push(
				`[${date} at ${time}] ${action}${action === "Timeout" ? ` (${humanizeDuration(duration * 1000)})` : ""}${points !== 0 ? ` [${points}]` : ""}${reason ? ` for ${reason}` : ""} [case ${caseId}]${showUsername ? ` by ${moderator}` : ""}`,
			);
		}

		let description = `**Number of offenses:** ${offenceCount}\n`;

		description += Object.entries(counts)
			.map(([action, count]) =>
				count > 0 ? `- **${action}s:** ${count}` : "",
			)
			.filter((x) => x !== "")
			.join("\n");

		description += `\n\n**Total points:** ${totalPoints}\n\n`;
		description += "```";
		description += punishmentsList.join("\n");
		description += "```";

		const embed = new EmbedBuilder()
			.setTitle(
				`Moderation History for ${user.tag}${totalPoints >= 10 ? " *[ Action Required ]*" : ""}`,
			)
			.setAuthor({
				name: `${user.username} (ID: ${user.id})`,
				iconURL: user.displayAvatarURL(),
			})
			.setColor(Colors.DarkOrange)
			.setDescription(description);

		await interaction.editReply({
			embeds: [embed],
		});
	}
}