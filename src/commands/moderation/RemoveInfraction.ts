import { Punishment } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	ComponentType,
	PermissionFlagsBits,
	SlashCommandBuilder,
	StringSelectMenuBuilder
} from "discord.js";

export default class extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("remove_infractions")
				.setDescription("Remove infractions (for mods)")
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
				`${interaction.user.displayName} does not have any previous offenses.`
			);

			return;
		}

		const punishmentSelect = new StringSelectMenuBuilder()
			.setCustomId("infraction")
			.setMinValues(1)
			.setPlaceholder("Punishments")
			.addOptions(
				...punishments.map(({ caseId, action, reason, id }) => ({
					label: `Case#${caseId} | ${action} - ${reason}`,
					value: id
				}))
			);

		const row =
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				punishmentSelect
			);

		const interactionResponse = await interaction.reply({
			components: [row],
			ephemeral: true
		});

		await interactionResponse
			.createMessageComponentCollector({
				time: 60000,
				componentType: ComponentType.StringSelect,
				filter: (i) =>
					i.user.id === interaction.user.id &&
					i.customId === "infraction"
			})
			.on("collect", async (selectInteraction) => {
				await interaction.deleteReply();

				for (const id of selectInteraction.values) {
					const res = await Punishment.findByIdAndDelete(id);

					if (!res) {
						interaction.followUp({
							content: `Unable to delete: ${id}`
						});

						return;
					}

					interaction.followUp({
						content: `Deleted #${res.caseId}`
					});
				}
			});
	}
}
