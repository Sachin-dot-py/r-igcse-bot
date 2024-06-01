import ConfessionBanModal from "@/components/ConfessionBanModal";
import DisabledMCQButtons from "@/components/practice/DisabledMCQButtons";
import { ConfessionBan, PracticeSession } from "@/mongo";
import {
	ButtonInteractionCache,
	GuildPreferencesCache,
	PracticeQuestionCache
} from "@/redis";
import Logger from "@/utils/Logger";
import {
	ChannelType,
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	EmbedBuilder,
	Events,
	PermissionFlagsBits,
	PermissionOverwriteManager,
	PermissionsBitField,
	TextChannel,
	type ActionRowBuilder,
	type ButtonBuilder,
	type ButtonInteraction,
	type Interaction
} from "discord.js";
import { v4 as uuidv4 } from "uuid";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import { HostSession } from "@/mongo/schemas/HostSession";
import { StudyChannel } from "@/mongo/schemas/StudyChannel";

export default class InteractionCreateEvent extends BaseEvent {
	constructor() {
		super(Events.InteractionCreate);
	}

	async execute(client: DiscordClient<true>, interaction: Interaction) {
		try {
			if (
				interaction.isChatInputCommand() ||
				interaction.isContextMenuCommand()
			)
				this.handleCommand(client, interaction);
			else if (interaction.isButton()) {
				this.handleMCQButton(client, interaction);
				this.handleConfessionButton(client, interaction);
				this.handleHostSessionButton(client, interaction);
			}
		} catch (error) {
			Logger.error(error);

			if (!interaction.inCachedGuild()) return;

			const embed = new EmbedBuilder()
				.setAuthor({
					name: "An Exception Occured",
					iconURL: client.user.displayAvatarURL()
				})
				.setDescription(
					`Channel: <#${interaction.channelId}> \nUser: <@${interaction.user.id}>\nError: \`\`\`${(error as Error)?.stack || error}\`\`\``
				);

			const mainGuild = client.guilds.cache.get(
				process.env.MAIN_GUILD_ID
			);
			if (!mainGuild) return;

			await Logger.channel(mainGuild, process.env.ERROR_LOGS_CHANNEL_ID, {
				embeds: [embed]
			});
		}
	}

	async handleCommand(
		client: DiscordClient<true>,
		interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction
	) {
		const command = client.commands.get(interaction.commandName);
		if (!command) return;

		await command.execute(client, interaction);
	}

	async handleMCQButton(
		client: DiscordClient<true>,
		interaction: ButtonInteraction
	) {
		const matchCustomIdRegex =
			/[ABCD]_\d{4}_[msw]\d{1,2}_qp_\d{1,2}_q\d{1,3}_.*/;
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
			sessionId: question.sessionId
		});

		if (!session) {
			await interaction.reply({
				content: "Invalid question! (Session no longer exists)",
				ephemeral: true
			});
			return;
		}

		if (!session.users.includes(interaction.user.id)) {
			await interaction.reply({
				content: "You are not in this session",
				ephemeral: true
			});
			return;
		}

		if (
			question.userAnswers
				.map((x) => x.user)
				.includes(interaction.user.id)
		) {
			await interaction.reply({
				content: "You have already answered this question!",
				ephemeral: true
			});
			return;
		}

		question.userAnswers.push({
			user: interaction.user.id,
			answer: interaction.component.label || "Error"
		});

		if (interaction.component.label === question.answers) {
			await interaction.reply({
				content: "Correct!",
				ephemeral: true
			});
		} else {
			await interaction.reply({
				content: "Incorrect!",
				ephemeral: true
			});
		}

		const allUsersSorted = session.users.sort();

		if (
			question.userAnswers.length === allUsersSorted.length &&
			question.userAnswers
				.map((x) => x.user)
				.sort()
				.every((x, i) => x === allUsersSorted[i])
		) {
			question.solved = true;
			ButtonInteractionCache.remove(customId);

			const thread = interaction.guild?.channels.cache.get(
				session.threadId
			);

			if (thread && thread.isThread()) {
				const message = await thread.messages.fetch(button.messageId);

				await message.edit({
					components: [
						new DisabledMCQButtons(
							customId,
							question.answers
						) as ActionRowBuilder<ButtonBuilder>
					]
				});
				await thread.send({
					embeds: [
						new EmbedBuilder()
							.setTitle("Question Solved!")
							.setDescription(
								`Correct answer: ${question.answers}\n\n${question.userAnswers.map((x) => `<@${x.user}>: ${x.answer}`).join("\n")}`
							)
					]
				});

				session.currentlySolving = "none";
				await session.save();
			}
		}

		await PracticeQuestionCache.save(question);
	}

	async handleConfessionButton(
		client: DiscordClient<true>,
		interaction: ButtonInteraction
	) {
		const matchCustomIdRegex = /(.*_confession)_(accept|reject|ban)/gi;
		const regexMatches = matchCustomIdRegex.exec(interaction.customId);
		if (!regexMatches) return;

		const confessionId = regexMatches[1];
		const action = regexMatches[2];
		if (!confessionId || !action) return;

		const button = await ButtonInteractionCache.get(confessionId);
		if (!button || !button.guildId || !button.userHash) return;

		const guildPreferences = await GuildPreferencesCache.get(
			button.guildId
		);
		if (
			!guildPreferences ||
			!guildPreferences.confessionApprovalChannelId ||
			!guildPreferences.confessionsChannelId
		)
			return;

		const approvalChannel = client.channels.cache.get(
			guildPreferences.confessionApprovalChannelId
		);
		if (!approvalChannel || !(approvalChannel instanceof TextChannel))
			return;

		const message = await approvalChannel.messages.fetch(button.messageId);
		if (!message) return;

		const confession = message.embeds[0].description;
		if (!confession) return;

		switch (action) {
			case "accept": {
				const confessionsChannel = client.channels.cache.get(
					guildPreferences.confessionsChannelId
				);
				if (
					!confessionsChannel ||
					!(confessionsChannel instanceof TextChannel)
				)
					return;

				const confessionEmbed = new EmbedBuilder()
					.setDescription(confession)
					.setColor("Random");

				const confessionMsg = await confessionsChannel.send({
					embeds: [confessionEmbed],
					content: "New Anonymous Confession"
				});

				const acceptEmbed = new EmbedBuilder()
					.setAuthor({
						name: `Confession accepted by ${interaction.user.tag}`
					})
					.setDescription(confession)
					.setColor("Green");

				await message.edit({
					embeds: [acceptEmbed],
					components: []
				});

				await interaction.reply({
					content: `Confession accepted, ${confessionMsg.url}`,
					ephemeral: true
				});
				break;
			}
			case "reject": {
				const rejectEmbed = new EmbedBuilder()
					.setAuthor({
						name: `Confession rejected by ${interaction.user.tag}`
					})
					.setDescription(confession)
					.setColor("Red");

				await message.edit({
					embeds: [rejectEmbed],
					components: []
				});

				await interaction.reply({
					content: "Confession rejected",
					ephemeral: true
				});
				break;
			}
			case "ban": {
				const modalCustomId = uuidv4();
				const modal = new ConfessionBanModal(modalCustomId);
				await interaction.showModal(modal);
				const modalResponse = await modal.waitForResponse(
					modalCustomId,
					interaction
				);
				if (!modalResponse) return;

				const confessionBan = new ConfessionBan({
					userHash: button.userHash,
					guildId: button.guildId,
					reason: modalResponse.reason
				});

				await confessionBan.save();

				const banEmbed = new EmbedBuilder()
					.setAuthor({
						name: `Confession rejected by ${interaction.user.tag} and user BANNED 🔨`
					})
					.setDescription(confession)
					.setColor("Red")
					.addFields([
						{
							name: "Reason",
							value: modalResponse.reason
						}
					]);

				await message.edit({
					embeds: [banEmbed],
					components: []
				});

				await modalResponse.followUpInteraction.reply({
					content: "Confession rejected and user banned",
					ephemeral: true
				});
				break;
			}
			default:
				break;
		}

		await ButtonInteractionCache.remove(confessionId);
	}

	async handleHostSessionButton(
		client: DiscordClient<true>,
		interaction: ButtonInteraction
	) {
		const matchCustomIdRegex = /(.*_host_session)_(accept|reject|ban)/gi;
		const regexMatches = matchCustomIdRegex.exec(interaction.customId);
		if (!regexMatches) return;

		const hostSessionId = regexMatches[1];
		const action = regexMatches[2];
		if (!hostSessionId || !action) return;

		const button = await ButtonInteractionCache.get(hostSessionId);
		if (!button || !button.guildId || !button.userId) return;

		const guildPreferences = await GuildPreferencesCache.get(
			button.guildId
		);
		if (
			!guildPreferences ||
			!guildPreferences.hostSessionApprovalChannelId ||
			!guildPreferences.hostSessionChannelId
		)
			return;

		const approvalChannel = client.channels.cache.get(
			guildPreferences.hostSessionApprovalChannelId
		);
		if (!approvalChannel || !(approvalChannel instanceof TextChannel))
			return;

		const message = await approvalChannel.messages.fetch(button.messageId);
		if (!message) return;

		const hostSession = await HostSession.findOne({
			messageId: button.messageId
		});

		if (!hostSession) return;

		const teachers = hostSession.teachers;

		let acceptedSessionMessage =
			`<@&${hostSession.studyPingRoleId}>, there will be a study session hosted <t:${hostSession.startDate}:R> at <t:${hostSession.startDate}:t>, and will end on <t:${hostSession.endDate}:t>\nIt will be hosted by `;

		for (const teacherId of teachers) {
			acceptedSessionMessage += `<@${teacherId}> `;
		}

		acceptedSessionMessage += `\nThe following topics will be covered: ${hostSession.contents}`;

		const studyChannelDocument = await StudyChannel.findOne({ studyPingRoleId: hostSession.studyPingRoleId });
		if (!studyChannelDocument) return;
		const studyChannel = interaction.guild?.channels.cache.get(studyChannelDocument.channelId)
		if (!studyChannel) return;

		let nameArray = studyChannel?.name.split('-');

		for (let i = 0; i < nameArray.length; i++) {
			const splitName = `${nameArray[i].substring(0, 1).toUpperCase()}${nameArray[i].substring(1)}`;
			nameArray[i] = splitName;
		}

		let name = `${nameArray.toString().replace(/,/g, " ").replace('Ig', "IGCSE").replace('As', 'AS').replace('Al', 'AL')} Hosted Study Session`

		switch (action) {
			case "accept": {
				interaction.deferReply({ ephemeral: true });

				const hostSessionChannel = client.channels.cache.get(
					guildPreferences.hostSessionChannelId
				);
				if (!hostSessionChannel || !(hostSessionChannel instanceof TextChannel)) return;

				const sessionChannel = await interaction.guild?.channels.create({
					name,
					type: ChannelType.GuildStageVoice,
					permissionOverwrites: [{
						id: message.guild.roles.everyone.id,
						deny: PermissionFlagsBits.Connect
					}]
				});

				if (!sessionChannel) {
					interaction.editReply({
						content: "An error occurred"
					});

					return;
				}

				const event = await interaction.guild?.scheduledEvents.create({
					name,
					description: acceptedSessionMessage,
					scheduledStartTime: new Date(hostSession.startDate * 1000),
					scheduledEndTime: new Date(hostSession.endDate * 1000),
					privacyLevel: 2,
					entityType: 1,
					channel: sessionChannel
				})

				if (!event) {
					interaction.editReply({
						content: "An error occurred"
					});

					return;
				}

				const eventLink = await event.createInviteURL()

				acceptedSessionMessage += `\n\n${eventLink}`;

				await hostSession.updateOne({
					accepted: true,
					channelId: sessionChannel.id,
					scheduledEventId: event.id
				});

				await hostSessionChannel.send({
					content: acceptedSessionMessage
				});

				const acceptEmbed = new EmbedBuilder()
					.setAuthor({
						name: `Session accepted by ${interaction.user.tag}`
					})
					.setDescription(message.embeds[0].description)
					.setColor("Green");

				await message.edit({
					embeds: [acceptEmbed],
					components: []
				});

				await interaction.editReply({
					content: `Session accepted`
				});
				break;
			}
			case "reject": {

				await hostSession.deleteOne();

				const rejectEmbed = new EmbedBuilder()
					.setAuthor({
						name: `Session rejected by ${interaction.user.tag}`
					})
					.setDescription(message.embeds[0].description)
					.setColor("Red");

				await message.edit({
					embeds: [rejectEmbed],
					components: []
				});

				await interaction.reply({
					content: "Session rejected",
					ephemeral: true
				});
				break;
			}
			default:
				break;
		}

		await ButtonInteractionCache.remove(regexMatches[1]);
	}
}
