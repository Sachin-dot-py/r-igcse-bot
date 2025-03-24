import { Application } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import {
	ActionRowBuilder,
	Colors,
	ComponentType,
	EmbedBuilder,
	ModalBuilder,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextChannel,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "../../registry/Structure/BaseCommand";

export default class ApplyCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("apply")
				.setDescription("Apply for positions in the server"),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const applications = await Application.find({
			guildId: interaction.guildId,
		});

		if (applications.length === 0) {
			await interaction.reply({
				content:
					"There are no applications in this server. Try again later.",
				ephemeral: true,
			});
			return;
		}

		const options = applications
			.filter((app) => {
				if (app.requiredRoles?.length) {
					return app.requiredRoles.some((role) =>
						interaction.member.roles.cache.has(role),
					);
				}
				return true;
			})
			.map((app) => {
				return new StringSelectMenuOptionBuilder()
					.setLabel(app.name)
					.setValue(app.id)
					.setDescription(app.description)
					.setEmoji(app.emoji || "");
			});

		if (options.length === 0) {
			await interaction.reply({
				content:
					"You do not have the required roles to apply for any positions!",
				ephemeral: true,
			});
			return;
		}

		const customId = uuidv4();

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId(customId)
			.setPlaceholder("Select a position to apply for")
			.addOptions(options)
			.setMinValues(1)
			.setMaxValues(1);

		const row =
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				selectMenu,
			);

		const selectInteraction = await interaction.reply({
			content: "Select a position to apply for",
			components: [row],
			ephemeral: true,
		});

		const selectResponse = await selectInteraction.awaitMessageComponent({
			filter: (i) => i.customId === customId,
			time: 300_000,
			componentType: ComponentType.StringSelect,
		});

		const applicationId = selectResponse.values[0];

		const application = await Application.findById(applicationId);

		if (!application) {
			await selectResponse.reply({
				content: "This application does not exist",
				ephemeral: true,
			});
			return;
		}

		const inputRows: ActionRowBuilder<TextInputBuilder>[] = [];

		for (let i = 0; i < application.questions.length; i++) {
			const input = new TextInputBuilder()
				.setLabel(application.questions[i])
				.setPlaceholder(application.questions[i])
				.setRequired(true)
				.setCustomId(`question_${i}`)
				.setStyle(TextInputStyle.Paragraph);

			inputRows.push(
				new ActionRowBuilder<TextInputBuilder>().addComponents(input),
			);
		}

		const modal = new ModalBuilder()
			.setTitle(`${application.name} Application`)
			.setCustomId(customId)
			.addComponents(inputRows);

		await selectResponse.showModal(modal);

		const modalInteraction = await selectResponse.awaitModalSubmit({
			time: 900_000, // 15 minutes
			filter: (i) => i.customId === customId,
		});

		if (!modalInteraction) return;

		const answers = modalInteraction.fields.fields.map(
			(field) => field.value,
		);

		const channel = interaction.guild.channels.cache.get(
			application.submissionChannelId,
		);

		if (!channel || !(channel instanceof TextChannel)) {
			await interaction.reply({
				content:
					"Invalid channel for submitting application. Please contact the server staff.",
				ephemeral: true,
			});
			return;
		}

		const embed = new EmbedBuilder()
			.setTitle(`New ${application.name} Application`)
			.setAuthor({
				name: interaction.user.tag,
				iconURL: interaction.user.displayAvatarURL(),
			})
			.setDescription(
				`Submitted by ${interaction.user} (${interaction.user.id})`,
			)
			.addFields(
				...answers.map((answer, i) => ({
					name: application.questions[i],
					value: answer,
				})),
			)
			.setColor(Colors.NotQuiteBlack);

		const message = await channel.send({ embeds: [embed] });

		const thread = await message.startThread({
			name: `${application.name} Application - ${interaction.user.username}`,
			autoArchiveDuration: 60,
		});

		const pollEmbed = new EmbedBuilder()
			.setTitle("Application Poll")
			.setDescription(
				"Please cast your vote on the application submitted.",
			)
			.setColor(Colors.Blurple);

		const pollMessage = await thread.send({ embeds: [pollEmbed] });

		await pollMessage.react("✅");
		await pollMessage.react("❌");

		await modalInteraction.reply({
			content: "Application submitted successfully",
			ephemeral: true,
		});
	}
}
