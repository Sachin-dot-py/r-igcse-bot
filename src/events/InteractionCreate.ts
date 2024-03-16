import Logger from "@/utils/Logger";
import {
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	EmbedBuilder,
	Events,
	type Interaction,
	type ButtonInteraction,
	type ActionRowBuilder,
	type ButtonBuilder,
} from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import {
	ButtonInteractionCache,
	GuildPreferencesCache,
	PracticeQuestionCache,
} from "@/redis";
import { PracticeSession } from "@/mongo";
import DisabledMCQButtons from "@/components/practice/DisabledMCQButtons";
import BaseEvent from "../registry/Structure/BaseEvent";

export default class InteractionCreateEvent extends BaseEvent {
	constructor() {
		super(Events.InteractionCreate);
	}

	async execute(client: DiscordClient<true>, interaction: Interaction) {
		try {
			if (interaction.isChatInputCommand())
				this.handleCommand(client, interaction);
			else if (interaction.isContextMenuCommand())
				this.handleMenu(client, interaction);
			else if (interaction.isButton()) {
				this.handleMCQButton(client, interaction);
			}
		} catch (error) {
			Logger.error(error);

			if (!interaction.inCachedGuild()) return;

			const embed = new EmbedBuilder()
				.setAuthor({
					name: "An Exception Occured",
					iconURL: client.user.displayAvatarURL(),
				})
				.setDescription(
					`Channel: <#${interaction.channelId}> \nUser: <@${interaction.user.id}>\nError: \`\`\`${(error as Error)?.stack || error}\`\`\``,
				);

			const mainGuild = client.guilds.cache.get(process.env.MAIN_GUILD_ID);
			if (!mainGuild) return;

			await Logger.channel(mainGuild, process.env.ERROR_LOGS_CHANNEL_ID, {
				embeds: [embed],
			});
		}
	}

	async handleCommand(
		client: DiscordClient<true>,
		interaction: ChatInputCommandInteraction,
	) {
		const command = client.commands.get(interaction.commandName);
		if (!command) return;

		await command.execute(client, interaction);
	}
	async handleMenu(
		client: DiscordClient<true>,
		interaction: ContextMenuCommandInteraction,
	) {
		const menu = client.menus.get(interaction.commandName);
		if (!menu) return;

		await menu.execute(client, interaction);
	}

	async handleMCQButton(
		client: DiscordClient<true>,
		interaction: ButtonInteraction,
	) {
		const matchCustomIdRegex = /A|B|C|D_\d\d\d\d_[msw]\d\d_qp_q.*_.*/;
		if (!matchCustomIdRegex.test(interaction.customId)) return;
		const customId = interaction.customId.split("_").slice(1).join("_");
		const button = await ButtonInteractionCache.get(customId);
		if (!button) return;

		const question = await PracticeQuestionCache.get(customId);
		if (!question) {
			ButtonInteractionCache.remove(customId);
			return;
		}

		const session = await PracticeSession.findOne({
			sessionId: question.sessionId,
		});

		if (!session) {
			await interaction.reply({
				content: "Invalid question! (Session no longer exists)",
				ephemeral: true,
			});
			return;
		}

		if (question.userAnswers.map((x) => x.user).includes(interaction.user.id)) {
			await interaction.reply({
				content: "You have already answered this question!",
				ephemeral: true,
			});
			return;
		}

		question.userAnswers.push({
			user: interaction.user.id,
			answer: interaction.component.label || "Error",
		});

		if (interaction.component.label === question.answers) {
			await interaction.reply({
				content: "Correct!",
				ephemeral: true,
			});
		} else {
			await interaction.reply({
				content: "Incorrect!",
				ephemeral: true,
			});
		}

		const allUsersSorted = session.users.sort();

		if (
			question.userAnswers
				.map((x) => x.user)
				.sort()
				.every((x, i) => x === allUsersSorted[i])
		) {
			question.solved = true;
			ButtonInteractionCache.remove(customId);

			const thread = interaction.guild?.channels.cache.get(session.threadId);

			if (thread && thread.isThread()) {
				const message = await thread.messages.fetch(button.messageId);

				await message.edit({
					components: [
						new DisabledMCQButtons(
							customId,
							question.answers,
						) as ActionRowBuilder<ButtonBuilder>,
					],
				});
				await thread.send({
					embeds: [
						new EmbedBuilder()
							.setTitle("Question Solved!")
							.setDescription(
								`Correct answer: ${question.answers}\n\n${question.userAnswers.map((x) => `<@${x.user}>: ${x.answer}`).join("\n")}`,
							),
					],
				});

				session.currentlySolving = "none";
				await session.save();
			}
		}

		await PracticeQuestionCache.save(question);
	}
}
