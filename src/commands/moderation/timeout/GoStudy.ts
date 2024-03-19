import { Punishment } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import parse from "parse-duration";

export default class GoStudyCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("go_study")
				.setDescription(
					"Disables the access to the offtopics (for mods)"
				)
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User to send to the corner")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("duration")
						.setDescription("Duration of the timeout")
						.setRequired(true)
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const user = interaction.options.getUser("user", true);
		const member = await interaction.guild.members.cache.get(user.id);

		if (!member) {
			await interaction.reply({
				content: "The specified user isn't a member of this server.",
				ephemeral: true
			});

			return;
		}

		const durationString =
			interaction.options.getString("duration", false) ?? "1hr";
		const duration = parse(durationString, "second") ?? 3600;

		const latestPunishment = await Punishment.findOne()
			.sort({ createdAt: -1 })
			.exec();

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		try {
			// TODO: GoStudy
		} catch (error) {
			await interaction.reply({
				content: "Failed to send user to corner",
				ephemeral: true
			});

			client.log(error, `${this.data.name} Command`, [
				{ name: "User ID", value: interaction.user.id }
			]);
		}

		await interaction.reply({
			content: `Successfully send ${user.tag} to the corner.`,
			ephemeral: true
		});
	}
}
