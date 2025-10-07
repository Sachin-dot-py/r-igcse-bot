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
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ModerateMembers,
				)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const user = interaction.options.getUser("user", true);
		//const showUsername = interaction.options.getBoolean("show_mod_username", false) ?? false;

		await interaction.deferReply();

		const punishments = await Punishment.find({
			guildId: interaction.guildId,
			actionAgainst: user.id,
		}).sort({ when: -1 });

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
		const notesList = [];

		// loop through punishments
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

			const moderator = interaction.guild.members.cache.get(actionBy)?.user.tag ?? actionBy;
			// convert date to unix timestamp
			const date = Math.round(when.valueOf() / 1000);
			const time = when.toLocaleTimeString("en-GB", {
				hour12: true,
				hour: "2-digit",
				minute: "2-digit",
			});

			// Make space every 5 infractions
			if (offenceCount % 5 === 0) {
				punishmentsList.push(" ")
			}

			// used multiple if statements to prevent insanely long .push with ternary operator
			switch (action) {
				case 'Warn':
					punishmentsList.push(
						`:exclamation: **\` WARN${points !== 0 ? ` [${points}]` : ""} \`** <t:${date}:f> ${reason ? `  - ${reason}` : "  - No reason specified."}\n` +
						`-# Action by: ${moderator} | Case: ${caseId}`
					);
					break;
				case 'Timeout':
					punishmentsList.push(
						`:mute: **\` TIMEOUT${points !== 0 ? ` [${points}]` : ""} \`** <t:${date}:f> - (${humanizeDuration(duration * 1000)})${reason ? `  - ${reason}` : "  - No reason specified."}\n` +
						`-# Action by: ${moderator} | Case: ${caseId}`
					);
					break;
				case 'Remove Timeout':
					punishmentsList.push(
						`:handshake: **\` UNTIMEOUT${points !== 0 ? ` [${points}]` : ""} \`** <t:${date}:f> ${reason ? `  - ${reason}` : "  - No reason specified."}\n` +
						`-# Action by: ${moderator} | Case: ${caseId}`
					);
					break;
				case 'Kick':
					punishmentsList.push(
						`:hammer: **\` KICK${points !== 0 ? ` [${points}]` : ""} \`** <t:${date}:f> ${reason ? `  - ${reason}` : "  - No reason specified."}\n` +
						`-# Action by: ${moderator} | Case: ${caseId}`
					);
					break;
				case 'Unban':
					punishmentsList.push(
						`:unlock: **\` UNBAN${points !== 0 ? ` [${points}]` : ""} \`** <t:${date}:f> ${reason ? `  - ${reason}` : "  - No reason specified."}\n` +
						`-# Action by: ${moderator} | Case: ${caseId}`
					);
					break;
				case 'Ban':
					punishmentsList.push(
						`:hammer: **\` BAN${points !== 0 ? ` [${points}]` : ""} \`** <t:${date}:f> ${reason ? `  - ${reason}` : "  - No reason specified."}\n` +
						`-# Action by: ${moderator} | Case: #${caseId}`
					);
					break;
			}
			// punishmentsList.push(
			//	`[${date} at ${time}] ${action}${action === "Timeout" ? ` (${humanizeDuration(duration * 1000)})` : ""}${points !== 0 ? ` [${points}]` : ""}${reason ? ` for ${reason}` : ""} [case ${caseId}]${showUsername ? ` by ${moderator}` : ""}`,
			//);	
		}

		// loop through notes
		for (const {
			when,
			actionBy,
			actionAgainst,
			note,
		} of notes) {

			const moderator = interaction.guild.members.cache.get(actionBy)?.user.tag ?? actionBy;
			// convert date to unix timestamp
			const date = Math.round(when.valueOf() / 1000);
			const time = when.toLocaleTimeString("en-GB", {
				hour12: true,
				hour: "2-digit",
				minute: "2-digit",
			});

			notesList.push(
				":pencil: **` NOTE `** " + `<t:${date}:f>` + `${note ? `  - ${note}` : "  - No reason specified."}` + `\n-# Action by: ${moderator}`
			)
		}

		let description = "";

		description += "\n\n**Summary**\n"
		
		description += Object.entries(counts)
			.map(([action, count]) =>
				count > 0 ? `- ${action}s: ${count}` : "",
			)
			.filter((x) => x !== "")
			.join("\n");
		//description += "\n\n"

		// `**Number of offenses:** ${offenceCount}\n`;
		//description += `\n\n**Total points:** ${totalPoints}\n`;
		description += `\n:warning: **Total Points: ${totalPoints}**\n\n`;
		description += punishmentsList.join("\n");
		//description += "\n"
		//description += notesList.join("\n");

		const infractionsEmbed = new EmbedBuilder()
			.setAuthor({
				name: `Infraction History for ${user.username} (Total Cases: ${offenceCount})`,
				iconURL: user.displayAvatarURL(),
			})
			.setColor(Colors.DarkOrange)
			.setDescription(description);
		
		const notesEmbed = new EmbedBuilder()
			.setAuthor({
				name: `Notes History for ${user.username}`,
				iconURL: user.displayAvatarURL(),
			})
			.setColor(Colors.Blurple)
			.setDescription(notesList.join("\n"));

		await interaction.editReply({
			embeds: [infractionsEmbed, notesEmbed],
		});
	}
}