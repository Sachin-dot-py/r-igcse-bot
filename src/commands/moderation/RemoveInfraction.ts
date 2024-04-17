import { Punishment } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	type ButtonBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	EmbedBuilder
} from "discord.js";
import Select from "@/components/Select";
import { v4 as uuidv4 } from "uuid";
import Buttons from "@/components/practice/views/Buttons";
import { GuildPreferencesCache } from "@/redis";
import Logger from "@/utils/Logger";

export default class extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("remove_infraction")
				.setDescription("Remove infraction (for mods)")
				.setDMPermission(false)
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User to remove infractions from")
						.setRequired(true)
				)
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ModerateMembers
				)
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
		});

		if (punishments.length < 1) {
			await interaction.reply(
				`${user.tag} does not have any previous offenses.`
			);

			return;
		}

		const customId = uuidv4();

		const punishmentSelect = new Select(
			"punishment",
			"Select a punishment to remove",
			punishments.map(({ caseId, action, reason, id }) => ({
				label: ((x) => (x.length > 100 ? `${x.slice(0, 97)}...` : x))(
					`Case #${caseId ?? "Unknown"} | ${action} - ${reason}`
				),
				value: id
			})),
			1,
			customId
		);

		const selectInteraction = await interaction.reply({
			content: "Select a punishment to remove",
			components: [
				new ActionRowBuilder<Select>().addComponents(punishmentSelect),
				new Buttons(customId) as ActionRowBuilder<ButtonBuilder>
			],
			fetchReply: true,
			ephemeral: true
		});

		const response = await punishmentSelect.waitForResponse(
			customId,
			selectInteraction,
			interaction,
			true
		);

		if (!response || response === "Timed out") return;

		const punishment = await Punishment.findById(response[0]);

		if (!punishment) {
			await interaction.reply({
				content: "Punishment not found",
				ephemeral: true
			});
			return;
		}

		try {
			await punishment.deleteOne();
		} catch (error) {
			interaction.followUp({
				content: `Failed to remove infraction ${error instanceof Error ? `(${error.message})` : ""}`
			});

			client.log(
				error,
				`${this.data.name} Command`,
				`
	* * Channel:** <#${interaction.channel?.id} >

			  	

					**User:** <@${interaction.user.id}>
					**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`
			);
		}

		await interaction.editReply({
			content: `Punishment removed for ${user.username}`,
			components: []
		});

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId
		);

		if (!guildPreferences || !guildPreferences.modlogChannelId) return;

		await Logger.channel(
			interaction.guild,
			guildPreferences.modlogChannelId,
			{
				embeds: [
					new EmbedBuilder()
						.setTitle("Punishment Removed")
						.setDescription(
							`Punishment removed for ${user.tag} (${user.id}) by ${interaction.user.tag} (${interaction.user.id})`
						)
						.addFields(
							{
								name: "Punishment Reason",
								value: punishment.reason
							},
							{
								name: "Action",
								value: punishment.action
							}
						)
						.setFooter({
							text: `Case #${punishment.caseId ?? "Unknown"}`
						})
				]
			}
		);
	}
}
