import {
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	TextChannel,
	ChannelType,
	EmbedBuilder,
	StringSelectMenuOptionBuilder,
	type GuildBasedChannel,
	type AnyThreadChannel,
} from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import SessionInfoModal from "@/components/practice/SessionInfoModal";
import Buttons from "@/components/practice/views/Buttons";
import SubjectSelect from "@/components/practice/views/SubjectSelect";
import TopicSelect from "@/components/practice/views/TopicSelect";
import VisibiltySelect from "@/components/practice/views/VisibiltySelect";
import UserSelectView from "@/components/practice/views/UserSelectView";
import { PracticeSession, Question, type IPracticeSession } from "@/mongo";
import { practiceSubjects, subjectTopics } from "@/data";
import { v4 as uuidv4 } from "uuid";
import type { DiscordClient } from "@/registry/DiscordClient";
import { logger } from "@/index";
import { UserCache, PracticeQuestionCache } from "@/redis";
import type { Document } from "mongoose";
import type {
	IPracticeQuestion,
	PracticeQuestionResponse,
} from "@/redis/schemas/Question";
import Select from "@/components/Select";
import UserSelect from "@/components/practice/UserSelect";

type CommandOptions = {
	[key: string]: (
		interaction: DiscordChatInputCommandInteraction,
	) => Promise<void>;
};

type CollectedData = {
	minimumYear: number;
	numberOfQuestions: number;
	subject: string[];
	topics: string[];
	visibility: string[];
	users: string[];
};

type PracticeQuestionCount = { [key: string]: number };

export default class PracticeCommand extends BaseCommand {
	constructor() {
		const actions = [
			"New Session",
			"Leave Session",
			"End Session",
			"Join Session",
			"Add to Session",
			"Remove from Session",
			"Session Info",
		];
		super(
			new SlashCommandBuilder()
				.setName("practice")
				.setDescription("Practice IGCSE Questions (MCQs only)")
				.addStringOption((option) =>
					option
						.setName("action")
						.addChoices(...actions.map((key) => ({ name: key, value: key })))
						.setDescription("Choose an action")
						.setRequired(true),
				),
		);
	}

	options: CommandOptions = {
		"New Session": this.newSession,
		"Leave Session": this.leaveSession,
		"End Session": this.endSession,
		"Join Session": this.joinSession,
		"Add to Session": this.addToSession,
		"Remove from Session": this.removeFromSession,
		"Session Info": this.sessionInfo,
	};

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction,
	) {
		const action = interaction.options.getString("action");
		if (action) {
			this.options[action].bind(this)(interaction);
		}
	}

	private async newSession(interaction: DiscordChatInputCommandInteraction) {
		const inSessionCheck = await this.userInSessionCheck(interaction, false);
		if (inSessionCheck) return;
		if (!(interaction.channel instanceof TextChannel) || !interaction.guild) {
			await interaction.reply({
				content:
					"This command cannot be used here, please run it from a channel instead.",
				ephemeral: true,
			});
			return;
		}
		const modalCustomId = uuidv4();
		const modal = new SessionInfoModal(modalCustomId);

		let collectedData: CollectedData = {
			minimumYear: 0,
			numberOfQuestions: 0,
			subject: [],
			topics: [],
			visibility: [],
			users: [],
		};

		await interaction.showModal(modal);
		const modalResponse = await modal.waitForResponse(
			modalCustomId,
			interaction,
		);
		if (!modalResponse) return;
		const { minimumYear, numberOfQuestions, followUpInteraction } =
			modalResponse;

		collectedData.minimumYear = minimumYear;
		collectedData.numberOfQuestions = numberOfQuestions;

		const dataInteractions = [
			{
				content: "Select a subject to practice!",
				view: SubjectSelect,
				key: "subject",
			},
			{
				content:
					"Select the topics you want to practice! Click continue if you want to select all topics.",
				view: TopicSelect,
				key: "topics",
			},
			{
				content: "Do you want the session to be private or public?",
				view: VisibiltySelect,
				key: "visibility",
			},
			{
				content: "Select the users you want to add to the session",
				view: UserSelectView,
				key: "users",
			},
		];

		for (const interaction in dataInteractions) {
			const { content, view, key } = dataInteractions[interaction];
			const customId = uuidv4();
			const viewInstance = new view(
				customId,
				collectedData["subject"]?.[0] || "",
			);
			let viewInteraction;
			if (interaction === "0") {
				viewInteraction = await followUpInteraction.reply({
					content,
					components: [
						...viewInstance.rows,
						new Buttons(customId) as ActionRowBuilder<ButtonBuilder>,
					],
					ephemeral: true,
					fetchReply: true,
				});
			} else {
				viewInteraction = await followUpInteraction.editReply({
					content,
					components: [
						...viewInstance.rows,
						new Buttons(customId) as ActionRowBuilder<ButtonBuilder>,
					],
				});
			}

			const arrays = await Promise.all(
				viewInstance.rows.map(async (row, index) => {
					const select = row.components[0];
					return select.waitForResponse(
						`${customId}_${index}`,
						viewInteraction,
						followUpInteraction,
						key === "topics" ? false : true,
					);
				}),
			);

			let data = arrays.flat();
			if (!data || data.every((x) => x === false)) {
				if (key !== "topics") break;
				data = subjectTopics[collectedData["subject"][0]];
			}
			data = data.filter((x) => typeof x === "string");
			// @ts-ignore
			collectedData[key] = data;
		}

		if (!collectedData.users.includes(interaction.user.id)) {
			collectedData.users.push(interaction.user.id);
		}

		const questions = await Question.getQuestions(
			collectedData.subject[0],
			collectedData.minimumYear,
			collectedData.numberOfQuestions,
			collectedData.topics,
			"mcq",
		);

		if (questions.length === 0) {
			await interaction.reply({
				content: "No questions found, try again.",
				ephemeral: true,
			});
			return;
		}

		const sessionId = uuidv4().split("-")[0];

		await questions.forEach(async (question) => {
			const { subject, year, season, paper, variant, questionNumber } =
				question;

			const questionName = `${subject}_${season}${year.toString().slice(-2)}_qp_${paper}${variant}_q${questionNumber}_${sessionId}`;
			await PracticeQuestionCache.set(questionName, {
				questionName,
				questions: question.questions,
				answers: question.answers,
				solved: false,
				userAnswers: [],
				sessionId: sessionId,
			});
			PracticeQuestionCache.expire(questionName, 60 * 60 * 2);
		});

		const thread = await interaction.channel.threads.create({
			name: `${interaction.user.username}'s Practice Session`,
			type: ChannelType.PrivateThread,
		});

		for (const user of collectedData.users) {
			const member = interaction.guild.members.cache.get(user);
			if (!member) continue;
			await thread.members.add(member);
			await UserCache.set(user, {
				userId: user,
				playing: true,
				subject: collectedData.subject[0],
				sessionId,
			});
			UserCache.expire(user, 60 * 60 * 2);
		}

		const session = new PracticeSession({
			sessionId,
			channelId: interaction.channel.id,
			threadId: thread.id,
			subject: collectedData.subject[0],
			topics: collectedData.topics,
			limit: collectedData.numberOfQuestions,
			minimumYear: collectedData.minimumYear,
			users: collectedData.users,
			owner: interaction.user.id,
			private: collectedData.visibility[0] === "private",
			paused: false,
			currentlySolving: "none",
			expireTime: new Date(Date.now() + 60 * 60 * 2),
		});

		await session.save();

		await thread.send(
			`New practice session started by <@${interaction.user.id}>

Subject: ${practiceSubjects[collectedData.subject[0]]}
Questions: ${collectedData.numberOfQuestions}
Visibility: ${collectedData.visibility[0]}
Users: ${collectedData.users.map((x) => `<@${x}>`).join(", ")}

Session ID: ${sessionId}`,
		);

		await followUpInteraction.editReply({
			content: `Practice session created! <#${thread.id}>`,
			components: [],
		});
	}

	private async leaveSession(interaction: DiscordChatInputCommandInteraction) {
		const inSessionCheck = await this.userInSessionCheck(interaction, true);
		if (inSessionCheck) return;
		const user = await UserCache.get(interaction.user.id);
		if (!user) {
			await interaction.reply({
				content: "An error occurred, please try again.",
				ephemeral: true,
			});
			return;
		}
		const sessionId = user.sessionId;
		const session = await PracticeSession.findOne({ sessionId });
		if (!session) {
			await interaction.reply({
				content: "An error occurred, please try again.",
				ephemeral: true,
			});
			logger.error(
				`User is in a session but session not found in database. User: ${interaction.user.id} Session: ${sessionId}`,
			);
			return;
		}
		if (session.owner === interaction.user.id) {
			await interaction.reply({
				content:
					"You cannot leave a session you started. Please end the session instead.",
				ephemeral: true,
			});
			return;
		}
		await UserCache.remove(interaction.user.id);
		let thread = await this.getThread(interaction, session);
		if (!thread) return;

		await thread.send(`<@${interaction.user.id}> has left the session.`);
		await thread.members.remove(interaction.user.id);

		await interaction.reply({
			content: "You have left the session.",
			ephemeral: true,
		});
	}

	private async endSession(interaction: DiscordChatInputCommandInteraction) {
		const inSessionCheck = await this.userInSessionCheck(interaction, true);
		if (inSessionCheck) return;
		const user = await UserCache.get(interaction.user.id);
		if (!user) {
			await interaction.reply({
				content: "An error occurred, please try again.",
				ephemeral: true,
			});
			return;
		}
		const sessionId = user.sessionId;
		const session = await PracticeSession.findOne({ sessionId });

		if (!session) {
			await interaction.reply({
				content: "An error occurred, please try again.",
				ephemeral: true,
			});
			logger.error(
				`User is in a session but session not found in database. User: ${interaction.user.id} Session: ${sessionId}`,
			);
			return;
		}

		if (session.owner !== interaction.user.id) {
			await interaction.reply({
				content:
					"You are not the owner of the session. Please leave the session instead",
				ephemeral: true,
			});
			return;
		}

		await this.endAndSendResults(
			interaction,
			session,
			`Session ended by <@${interaction.user.id}>`,
		);
	}

	private async joinSession(interaction: DiscordChatInputCommandInteraction) {
		const inSessionCheck = await this.userInSessionCheck(interaction, false);
		if (inSessionCheck) return;

		const sessions = await PracticeSession.find({
			private: false,
		});

		if (sessions.length === 0) {
			await interaction.reply({
				content: "There are no public sessions available at the moment!",
				ephemeral: true,
			});
			return;
		}

		const customId = uuidv4();
		const sessionOpts: StringSelectMenuOptionBuilder[] = sessions.map(
			(session) => {
				const sessionOwner =
					interaction.guild?.members.cache.get(session.owner)?.displayName || session.owner;
				return new StringSelectMenuOptionBuilder()
					.setLabel(session.sessionId)
					.setDescription(
						`Subject: ${practiceSubjects[session.subject]} by ${sessionOwner}`,
					)
					.setValue(session.sessionId);
			},
		);
		const selectMenu = new Select(
			"join_session",
			"Select a session to join",
			sessionOpts,
			1,
			customId,
		);
		const row = new ActionRowBuilder<Select>().addComponents(selectMenu);

		const selectInteraction = await interaction.reply({
			content: "Select a session to join",
			components: [
				row,
				new Buttons(customId) as ActionRowBuilder<ButtonBuilder>,
			],
			ephemeral: true,
			fetchReply: true,
		});

		const sessionResponse = await selectMenu.waitForResponse(
			customId,
			selectInteraction,
			interaction,
			true,
		);

		if (!sessionResponse) return;

		const sessionId = sessionResponse[0];

		const session = await PracticeSession.findOne({ sessionId });

		if (!session) {
			await interaction.editReply({
				content: "An error occurred, please try again.",
				components: [],
			});
			logger.error(`Session not found: ${sessionId}`);
			return;
		}

		const thread = await this.getThread(interaction, session);
		if (!thread) return;

		await thread?.members.add(interaction.user.id);

		await UserCache.set(interaction.user.id, {
			userId: interaction.user.id,
			playing: true,
			subject: session.subject,
			sessionId,
		});
		UserCache.expire(interaction.user.id, 60 * 60 * 2);

		session.users.push(interaction.user.id);
		await session.save();

		await interaction.editReply({
			content: `You have joined the session! <#${thread.id}>`,
			components: [],
		});
	}

	private async addToSession(interaction: DiscordChatInputCommandInteraction) {
		const inSessionCheck = await this.userInSessionCheck(interaction, true);
		if (inSessionCheck) return;

		const user = await UserCache.get(interaction.user.id);
		if (!user) {
			await interaction.reply({
				content: "An error occurred, please try again.",
				ephemeral: true,
			});
			return;
		}

		const sessionId = user.sessionId;
		const session = await PracticeSession.findOne({ sessionId });

		if (!session) {
			await interaction.reply({
				content: "An error occurred, please try again.",
				ephemeral: true,
			});
			logger.error(
				`User is in a session but session not found in database. User: ${interaction.user.id} Session: ${sessionId}`,
			);
			return;
		}

		if (session.owner !== interaction.user.id) {
			await interaction.reply({
				content: "You are not the owner of the session.",
				ephemeral: true,
			});
			return;
		}

		const customId = uuidv4();
		const userSelect = new UserSelect(
			customId,
			"Select users to add to the session",
			25,
			customId,
		);

		const selectInteraction = await interaction.reply({
			content: "Select users to add to the session",
			components: [
				new ActionRowBuilder<UserSelect>().addComponents(userSelect),
				new Buttons(customId) as ActionRowBuilder<ButtonBuilder>,
			],
			ephemeral: true,
			fetchReply: true,
		});

		const userResponse = await userSelect.waitForResponse(
			customId,
			selectInteraction,
			interaction,
			true,
		);

		if (!userResponse) return;

		const thread = await this.getThread(interaction, session);
		if (!thread) return;

		for (const user of userResponse) {
			let member = interaction.guild?.members.cache.get(user);
			if (!member) {
				try {
					member = await interaction.guild?.members.fetch(user);
				} catch (error) {
					logger.error(`Error fetching user: ${error} for user: ${user}`);
				}
			}
			if (!member) continue;
			await thread.members.add(member);
			await UserCache.set(user, {
				userId: user,
				playing: true,
				subject: session.subject,
				sessionId,
			});
			UserCache.expire(user, 60 * 60 * 2);
			await thread.send(`<@${user}> has been added to the session.`);
		}

		session.users.push(...userResponse);
		await session.save();

		await interaction.editReply({
			content: "User(s) have been added to the session.",
			components: [],
		});
	}

	private async removeFromSession(
		interaction: DiscordChatInputCommandInteraction,
	) {}

	private async sessionInfo(interaction: DiscordChatInputCommandInteraction) {}

	/**
	 * @param inSession - Whether the user needs to be in a session or not
	 */
	private async userInSessionCheck(
		interaction: DiscordChatInputCommandInteraction,
		inSession: boolean,
	): Promise<boolean> {
		const userId = interaction.user.id;
		const user = await UserCache.get(userId);

		if (!user) {
			return false;
		}

		switch (inSession) {
			case true:
				if (!user?.sessionId) {
					await interaction.reply({
						content: "You need to be in a session to use this command.",
						ephemeral: true,
					});
					return true;
				}
				return false;
			case false:
				if (user?.sessionId) {
					await interaction.reply({
						content: "You are already in a session",
						ephemeral: true,
					});
					return true;
				}
				return false;
		}
	}

	private async endAndSendResults(
		interaction: DiscordChatInputCommandInteraction,
		session: Document<any, {}, IPracticeSession> & IPracticeSession,
		message: string,
	): Promise<void> {
		const thread = await this.getThread(interaction, session);
		if (!thread) return;

		const questions = (await PracticeQuestionCache.search()
			.where("sessionId")
			.equals(session.sessionId)
			.return.all()) as IPracticeQuestion[];

		const numberOfSolvedQuestions = await PracticeQuestionCache.search()
			.where("sessionId")
			.equals(session.sessionId)
			.where("solved")
			.equals(true)
			.return.count();

		const correctAnswers: PracticeQuestionCount = {};
		const totalAnswers: PracticeQuestionCount = {};

		for (const question of questions) {
			const { answers, userAnswers } = question;
			for (const { user, answer } of userAnswers) {
				if (answer === answers) {
					if (correctAnswers[user]) {
						correctAnswers[user]++;
					} else {
						correctAnswers[user] = 1;
					}
				}
				if (totalAnswers[user]) {
					totalAnswers[user]++;
				} else {
					totalAnswers[user] = 1;
				}
			}
			PracticeQuestionCache.remove(question.questionName);
		}

		const embeds = [];
		let embed = new EmbedBuilder()
			.setTitle("Session Results")
			.setDescription(
				`There were a total of ${questions.length} questions in this session out of which ${numberOfSolvedQuestions} were solved.`,
			);

		for (let i = 0; i < session.users.length; i += 25) {
			const users = session.users.slice(i, i + 25);
			const fields = [];
			for (const user of users) {
				const correct = correctAnswers[user] || 0;
				const total = totalAnswers[user] || 0;
				let discordUser = interaction.guild?.members.cache.get(user);
				if (!user) {
					try {
						discordUser = await interaction.guild?.members.fetch(user);
					} catch (error) {
						logger.error(
							`Error fetching user: ${error} in session: ${session.sessionId} for user: ${user}`,
						);
					}
				}
				fields.push({
					name: discordUser?.displayName || user,
					value: `${correct}/${total} (${((correct / total) * 100).toFixed(2)}%)`,
					inline: true,
				});
			}
			embed.addFields(fields);
			embeds.push(embed);
			embed = new EmbedBuilder();
		}
		await thread.send(message);
		await thread.send({ embeds });

		for (const user of session.users) {
			await UserCache.remove(user);
		}

		await PracticeSession.deleteOne({ sessionId: session.sessionId });
		await thread.setArchived(true);
	}

	async getThread(
		interaction: DiscordChatInputCommandInteraction,
		session: Document<any, {}, IPracticeSession> & IPracticeSession,
	): Promise<AnyThreadChannel | undefined> {
		let thread = interaction.guild?.channels.cache.get(session.threadId);
		if (!thread?.isThread()) {
			await interaction.editReply({
				content: "An error occurred, please try again.",
				components: [],
			});
			logger.error(`Thread not found for session: ${session.sessionId}`);
			return undefined;
		}
		try {
			thread =
				(await interaction.guild?.channels.fetch(session.threadId)) ??
				undefined;
		} catch (error) {
			logger.error(
				`Error fetching thread: ${error} for session: ${session.sessionId}`,
			);
		}
		return thread as AnyThreadChannel;
	}
}
