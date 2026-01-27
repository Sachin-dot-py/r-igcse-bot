import { Punishment } from "@/mongo";
import { ModNote } from "@/mongo";
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

function shortenTime(duration: number): string {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}

export default class HistoryCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("history")
				.setDescription("View a users infraction history.")
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User you would like to see the history of.")
						.setRequired(true),
				)
				.addBooleanOption((option) =>
					option
						.setName("blame")
						.setDescription(
							"Show the staff responsible for the infractions.",
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
			interaction.options.getBoolean("blame", false) ?? false;

		await interaction.deferReply();

		const punishments = await Punishment.find({
			guildId: interaction.guildId,
			actionAgainst: user.id,
		}).sort({ when: 1 });
		
		// get notes collection
		const notes = await ModNote.find({
			guildId: interaction.guildId,
			actionAgainst: user.id,
		}).sort({ when: 1})

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
				interaction.guild.members.cache.get(actionBy)?.user.id ??
				actionBy;

			const timestamp = Math.round(when.getTime() / 1000);


			const actionNameMap: Record<string, string> = {
				"Ban": "BAN",
				"Kick": "KICK",
				"Nickname Reset": "NICK RESET",
				"Remove Timeout": "UNTIMEOUT",
				"Softban": "SOFT BAN",
				"Timeout": "TIMEOUT",
				"Unban": "UNBAN",
				"Warn": "WARN"
			}

			let whitespaceCount = (Math.round(12 - actionNameMap[action].length) / 2);

			punishmentsList.push(
				`**\`${" ".repeat(whitespaceCount)}${actionNameMap[action]}${" ".repeat(!(actionNameMap[action].length % 2 == 0) ? whitespaceCount+1 : whitespaceCount)}\`** ${action === "Timeout" ? ` **(${shortenTime(duration * 1000)})**` : ""} [[\`#${caseId}\`](https://discord.com/users/${user.id})] \<t:${timestamp}:s> ${reason ? ` - ${reason}` : ""} ${points !== 0 ? ` \`[${points}]\`` : ""} ${showUsername ? ` by <@${moderator}>` : ""}`
			);

		}

		// add space between notes & infractions for visibility
		punishmentsList.push(``);

		for (const {
			when,
			actionBy,
			actionAgainst,
			note
		} of notes) {

			const moderator =
				interaction.guild.members.cache.get(actionBy)?.user.id ??
				actionBy;

			const timestamp = Math.round(when.getTime() / 1000);

			punishmentsList.push(
				`**\`${" ".repeat(4)}NOTE${" ".repeat(4)}\`** <t:${timestamp}:s> ${note} ${showUsername ? ` by <@${moderator}>` : ""}`,
			);

		}

		let description = `> **Number of Infractions:** ${offenceCount}\n`;

		description += Object.entries(counts)
			.map(([action, count]) =>
				count > 0 ? `> -# **${action}s:** ${count}` : "",
			)
			.filter((x) => x !== "")
			.join("\n");

		description += `\n\n**Total Points:** ${totalPoints}\n\n`;
		description += punishmentsList.join("\n");

		const embed = new EmbedBuilder()
			.setTitle(
				`Moderation History for ${user.tag}${totalPoints >= 10 ? " *[ Action Required ]*" : ""}`,
			)
			.setAuthor({
				name: `${user.username} (ID: ${user.id})`,
				iconURL: user.displayAvatarURL(),
			})
			.setColor(Colors.Red)
			.setDescription(description);

		await interaction.editReply({
			embeds: [embed],
		});
	}
}