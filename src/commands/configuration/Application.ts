import RoleSelect from "@/components/RoleSelect";
import Buttons from "@/components/practice/views/Buttons";
import { Application } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ActionRowBuilder,
	type ButtonBuilder,
	ModalBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";

export default class ApplicationCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("application")
				.setDescription(
					"Create and edit /apply applications for your server (for admins)",
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.setDMPermission(false)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("create")
						.setDescription("Create a new application")
						.addStringOption((option) =>
							option
								.setName("name")
								.setDescription("The name of the position")
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("description")
								.setDescription(
									"The description of the position",
								)
								.setRequired(true),
						)
						.addChannelOption((option) =>
							option
								.setName("channel")
								.setDescription(
									"The channel to send the application to, when submitted.",
								)
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("emoji")
								.setDescription(
									"The emoji to use for the application",
								)
								.setRequired(false),
						),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("edit")
						.setDescription("Edit an existing application")
						.addStringOption((option) =>
							option
								.setName("name")
								.setDescription(
									"The name of the application to edit",
								)
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("description")
								.setDescription(
									"The new description of the position",
								)
								.setRequired(false),
						)
						.addChannelOption((option) =>
							option
								.setName("channel")
								.setDescription(
									"The new channel to send the application to, when submitted.",
								)
								.setRequired(false),
						)
						.addStringOption((option) =>
							option
								.setName("emoji")
								.setDescription(
									"The new emoji to use for the application",
								)
								.setRequired(false),
						),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("delete")
						.setDescription(
							"Delete an existing application (no confirmation)",
						)
						.addStringOption((option) =>
							option
								.setName("name")
								.setDescription(
									"The name of the application to delete",
								)
								.setRequired(true),
						),
				),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		switch (interaction.options.getSubcommand()) {
			case "create": {
				this.createApplication(interaction);
				break;
			}
			case "edit": {
				this.editApplication(interaction);
				break;
			}
			case "delete": {
				this.deleteApplication(interaction);
				break;
			}
		}
	}

	private async createApplication(
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const name = interaction.options.getString("name", true);
		const description = interaction.options.getString("description", true);
		const emoji = interaction.options.getString("emoji", false);
		const channel = interaction.options.getChannel("channel", true);

		const customId = uuidv4();

		const inputRows: ActionRowBuilder<TextInputBuilder>[] = [];

		for (let i = 0; i < 5; i++) {
			const input = new TextInputBuilder()
				.setLabel(`Question ${i + 1}`)
				.setPlaceholder("enter the question here")
				.setRequired(false)
				.setCustomId(`question_${i}`)
				.setStyle(TextInputStyle.Short);

			inputRows.push(
				new ActionRowBuilder<TextInputBuilder>().addComponents(input),
			);
		}

		const modal = new ModalBuilder()
			.setTitle("Create Application")
			.setCustomId(customId)
			.addComponents(inputRows);

		await interaction.showModal(modal);

		const modalInteraction = await interaction.awaitModalSubmit({
			time: 600_000,
		});
		if (!modalInteraction) return;

		const questions = modalInteraction.fields.fields
			.map((field) => field.value)
			.filter((value) => value);

		if (!questions.length) {
			await modalInteraction.reply({
				content: "You must provide at least one question",
				flags: 64,
			});
			return;
		}

		const roleSelect = new RoleSelect(
			"required_role_select",
			"Select the roles required for this application",
			25,
			`${customId}_0`,
			[],
		);
		const row = new ActionRowBuilder<RoleSelect>().addComponents(
			roleSelect,
		);

		const selectInteraction = await modalInteraction.reply({
			content:
				"Select the roles required for the user to be able to see this application. If no roles are selected, everyone will be able to see it. (Any one of the selected roles will be required)",
			components: [
				row,
				new Buttons(customId) as ActionRowBuilder<ButtonBuilder>,
			],
			flags: 64,
			fetchReply: true,
		});

		const requiredRoles = await roleSelect.waitForResponse(
			`${customId}_0`,
			selectInteraction,
			interaction,
			false,
		);
		if (requiredRoles === "Timed out") return;

		const application = new Application({
			name,
			description,
			emoji,
			questions,
			requiredRoles: requiredRoles || null,
			submissionChannelId: channel.id,
			guildId: interaction.guild.id,
		});

		await application.save();

		await modalInteraction.editReply({
			content: "Application created successfully",
			components: [],
		});
	}

	private async editApplication(
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const name = interaction.options.getString("name", true);
		const description = interaction.options.getString("description", false);
		const emoji = interaction.options.getString("emoji", false);
		const channel = interaction.options.getChannel("channel", false);

		const application = await Application.findOne({
			name,
			guildId: interaction.guild.id,
		});

		if (!application) {
			await interaction.reply({
				content: "Application not found",
				flags: 64,
			});
			return;
		}

		if (description) application.description = description;
		if (emoji) application.emoji = emoji;
		if (channel) application.submissionChannelId = channel.id;

		const customId = uuidv4();

		const inputRows: ActionRowBuilder<TextInputBuilder>[] = [];

		for (let i = 0; i < 5; i++) {
			const input = new TextInputBuilder()
				.setLabel(`Question ${i + 1}`)
				.setPlaceholder("enter the question here")
				.setRequired(false)
				.setCustomId(`question_${i}`)
				.setStyle(TextInputStyle.Short)
				.setValue(application.questions[i] || "");

			inputRows.push(
				new ActionRowBuilder<TextInputBuilder>().addComponents(input),
			);
		}

		const modal = new ModalBuilder()
			.setTitle("Edit Application")
			.setCustomId(customId)
			.addComponents(inputRows);

		await interaction.showModal(modal);

		const modalInteraction = await interaction.awaitModalSubmit({
			time: 600_000,
		});
		if (!modalInteraction) return;

		const questions = modalInteraction.fields.fields
			.map((field) => field.value)
			.filter((value) => value);

		if (!questions.length) {
			await modalInteraction.reply({
				content: "You must provide at least one question",
				flags: 64,
			});
			return;
		}

		const roleSelect = new RoleSelect(
			"required_role_select",
			"Select the roles required for this application",
			25,
			`${customId}_0`,
			application.requiredRoles || [],
		);
		const row = new ActionRowBuilder<RoleSelect>().addComponents(
			roleSelect,
		);

		const selectInteraction = await modalInteraction.reply({
			content:
				"Select the roles required for the user to be able to see this application. If no roles are selected, everyone will be able to see it. (Any one of the selected roles will be required)",
			components: [
				row,
				new Buttons(customId) as ActionRowBuilder<ButtonBuilder>,
			],
			flags: 64,
			fetchReply: true,
		});

		const requiredRoles = await roleSelect.waitForResponse(
			`${customId}_0`,
			selectInteraction,
			interaction,
			false,
		);
		if (requiredRoles === "Timed out") return;

		application.questions = questions;
		application.requiredRoles = requiredRoles || undefined;

		await application.save();

		await modalInteraction.editReply({
			content: "Application edited successfully",
			components: [],
		});
	}

	private async deleteApplication(
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const name = interaction.options.getString("name", true);

		const application = await Application.findOne({
			name,
			guildId: interaction.guild.id,
		});

		if (!application) {
			await interaction.reply({
				content: "Application not found",
				flags: 64,
			});
			return;
		}

		await application.deleteOne();

		await interaction.reply({
			content: "Application deleted successfully",
			flags: 64,
		});
	}
}
