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
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {

		await HOTM.deleteMany({ guildId: interaction.guild.id });
		await HOTMUser.deleteMany({ guildId: interaction.guild.id });
		await GuildPreferences.updateOne({
			guildId: interaction.guild.id
		}, {
			hotmResultsEmbedId: null
		})

		interaction.reply({
			content: "Votes have been reset",
			ephemeral: true
		});
	}
}
