import { HOTM, HOTMUser, GuildPreferences } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class HOTMResetVotesCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("reset_hotm")
				.setDescription(
					"Reset votes for Helper Of The Month (for mods)"
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
				.setDMPermission(false)
			        .addIntegerOption((option) =>
					option
						.setName("end")
						.setDescription(
							"When to end HOTM voting. (Epoch)"
						)
						.setRequired(false)
				)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const end = interaction.options.getInteger("end", false);

		if (end) {
			await GuildPreferences.updateOne({
				guildId: interaction.guild.id
			}, {
				hotmEndTime: end * 1000 // milliseconds
			})
		}
		
		await HOTM.deleteMany({ guildId: interaction.guild.id });
		await HOTMUser.deleteMany({ guildId: interaction.guild.id });

		interaction.reply({
			content: "Votes have been reset",
			ephemeral: true
		});
	}
}
