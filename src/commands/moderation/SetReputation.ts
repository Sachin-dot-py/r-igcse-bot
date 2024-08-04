import { Reputation } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("set_rep")
				.setDescription("Change a users reputation (for mods)")
				.setDMPermission(false)
				.addIntegerOption((option) =>
					option
						.setName("new_rep")
						.setDescription("New reputation")
						.setRequired(true),
				)
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("The user to change the rep of")
						.setRequired(true),
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const user =
			interaction.options.getUser("user", false) ?? interaction.user;
		const newRep = interaction.options.getInteger("new_rep", true);

		const res = await Reputation.updateOne(
			{
				guildId: interaction.guild.id,
				userId: user.id,
			},
			{
				$set: {
					rep: newRep,
				},
			},
			{
				upsert: true,
			},
		);

		if (res.modifiedCount + res.upsertedCount === 0) {
			if (
				newRep ==
				(
					await Reputation.findOne({
						guildId: interaction.guild.id,
						userId: user.id,
					})
				)?.rep
			) {
				await interaction.reply({
					content: `${user.tag}'s rep is already ${newRep}`,
				});
				return;
			}
			await interaction.reply({
				content: "Failed to change rep",
			});
			return;
		}

		await interaction.reply({
			content: `Changed ${user.tag} rep to ${newRep}`,
		});
	}
}
