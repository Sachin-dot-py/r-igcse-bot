import { addKeyword } from "@/commands/configuration/KeywordControl";
import ConfessionBanModal from "@/components/ConfessionBanModal";
import disabledMcqButtons from "@/components/practice/DisabledMCQButtons";
import { ConfessionBan, PracticeSession, ResourceTag } from "@/mongo";
import { HostSession } from "@/mongo/schemas/HostSession";
import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import {
	ButtonInteractionCache,
	GuildPreferencesCache,
	PracticeQuestionCache,
} from "@/redis";
import { logToChannel } from "@/utils/Logger";
import { Logger } from "@discordforge/logger";
import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ChannelType,
	type ChatInputCommandInteraction,
	type ColorResolvable,
	Colors,
	type ContextMenuCommandInteraction,
	EmbedBuilder,
	Events,
	type Interaction,
	PermissionFlagsBits,
	TextChannel,
	MessageFlags,
	TextInputBuilder,
	TextInputStyle,
	ModalBuilder,
	ButtonStyle,
	ComponentType,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";

const channelRegex = /<#(\d+)>/;
const matchCustomIdRegex = /[ABCD]_\d{4}_[msw]\d{1,2}_qp_\d{1,2}_q\d{1,3}_.*/;

export default class InteractionCreateEvent extends BaseEvent {
	constructor() {
		super(Events.InteractionCreate);
	}

	async execute(client: DiscordClient<true>, interaction: Interaction) {
		try {
			if (
				interaction.isChatInputCommand() ||
				interaction.isContextMenuCommand()
			) {
				if (
					interaction.guildId &&
					process.env.BLACKLISTED_GUILDS.split(" ").includes(
						interaction.guildId,
					)
				) {
					await interaction.reply(
						"This guild has been blacklisted from using the r/IGCSE Bot due to [TOS](https://archive.chirag.dev/r-ig/bot-tos) violations. Please contact a server admin.",
					);
					return;
				}
				this.handleCommand(client, interaction);
			} else if (interaction.isButton()) {
				this.handleMCQButton(client, interaction);
				this.handleConfessionButton(client, interaction);
				this.handleHostSessionButton(client, interaction);
				this.handleKeywordButtons(client, interaction);
				this.handleResourceTagRequestButton(client, interaction);
			} else if (interaction.isAutocomplete()) {
				const command = client.commands.get(interaction.commandName);
				if (!command) return;
				try {
					await command.autoComplete(interaction);
				} catch (e) {
					Logger.error(e);
				}
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

			const mainGuild = client.guilds.cache.get(
				process.env.MAIN_GUILD_ID,
			);
			if (!mainGuild) return;

			logToChannel(mainGuild, process.env.ERROR_LOGS_CHANNEL_ID, {
				embeds: [embed],
			});
		}
	}

	async handleCommand(
		client: DiscordClient<true>,
		interaction:
			| ChatInputCommandInteraction
			| ContextMenuCommandInteraction,
	) {
		const command = client.commands.get(interaction.commandName);
		if (!command) return;

		await command.execute(client, interaction);
	}

	async handleMCQButton(
		client: DiscordClient<true>,
		interaction: ButtonInteraction,
	) {
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
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (!session.users.includes(interaction.user.id)) {
			await interaction.reply({
				content: "You are not in this session",
				flags: MessageFlags.Ephemeral,
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
				flags: MessageFlags.Ephemeral,
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
				flags: MessageFlags.Ephemeral,
			});
		} else {
			await interaction.reply({
				content: "Incorrect!",
				flags: MessageFlags.Ephemeral,
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
				session.threadId,
			);

			if (thread?.isThread()) {
				const message = await thread.messages.fetch(button.messageId);

				await message.edit({
					components: [
						new disabledMcqButtons(
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

	async handleResourceTagRequestButton(
		client: DiscordClient<true>,
		interaction: ButtonInteraction,
	) {
		const matchCustomIdRegex = /(.*_tag)_(accept|reject)/gi;
		const regexMatches = matchCustomIdRegex.exec(interaction.customId);
		if (!regexMatches) return;

		const tagId = regexMatches[1];
		const action = regexMatches[2];
		if (!tagId || !action) return;

		const button = await ButtonInteractionCache.get(tagId);
		if (!button || !button.guildId || !button.userId) return;

		const guildPreferences = await GuildPreferencesCache.get(
			button.guildId,
		);
		if (!guildPreferences || !guildPreferences.tagResourceApprovalChannelId)
			return;
		const approvalChannel = interaction.guild?.channels.cache.get(
			guildPreferences.tagResourceApprovalChannelId,
		);

		if (!approvalChannel || !(approvalChannel instanceof TextChannel))
			return;

		const message = await approvalChannel.messages.fetch(button.messageId);
		if (!message) return;

		const title = message.embeds[0].title;
		const description = message.embeds[0].description;
		const messageLink = message.embeds[0].fields[1].value;
		const channelId = channelRegex.exec(
			message.embeds[0].fields[2].value || "",
		)?.[1];
		const authorId = message.embeds[0].author?.name.split(" | ")[1];
		const guild = client.guilds.cache.get(button.guildId);
		const author = guild?.members.cache.find((m) => m.id === authorId);

		const helperRoleData = await StudyChannel.findOne({
			channelId: channelId,
		});
		const helperRoleId = helperRoleData?.helperRoleId;
		if (!helperRoleId) return;

		if (
			!interaction.member ||
			// discord.js sucks
			!interaction.member.roles.cache.has(helperRoleId)
		) {
			await interaction.reply({
				content: "You aren't a helper for this channel",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		switch (action) {
			case "accept": {
				const embedEdited = new EmbedBuilder()
					.setTitle(`${title} - Accepted by ${interaction.user.tag}`)
					.setDescription(description)
					.setColor("Green")
					.addFields(...message.embeds[0].fields)
					.setAuthor(message.embeds[0].author);

				await message.edit({
					embeds: [embedEdited],
					components: [],
				});

				const tagSearchRes = await ResourceTag.findOne({
					messageUrl: messageLink,
				});

				if (tagSearchRes) {
					return await interaction.reply({
						content:
							"This message has already been tagged as a resource",
						flags: MessageFlags.Ephemeral,
					});
				}

				const newRes = await ResourceTag.create({
					guildId: button.guildId,
					title,
					description,
					authorId: authorId,
					channelId: channelId,
					messageUrl: messageLink,
				});

				try {
					await interaction.reply({
						content: `Resource tag approved with ID \`${newRes._id}\``,
						flags: MessageFlags.Ephemeral,
					});
				} catch (error) {
					return;
				}

				await author?.send({
					content: `Your resource tag request has been approved! ${messageLink}`,
				});

				break;
			}
			case "reject": {
				const embedEdited = new EmbedBuilder()
					.setTitle(`${title} - Rejected by ${interaction.user.tag}`)
					.setDescription(description)
					.setColor("Red")
					.addFields(...message.embeds[0].fields)
					.setAuthor(message.embeds[0].author);

				await message.edit({
					embeds: [embedEdited],
					components: [],
				});

				try {
					await interaction.reply({
						content: "Resource tag rejected",
						flags: MessageFlags.Ephemeral,
					});
				} catch (error) {
					if ((error as Error).message === "Unknown Interaction") {
						return;
					}
				}

				await author?.send({
					content: `Your resource tag request has been rejected. ${messageLink}`,
				});

				break;
			}
		}

		if (!author) return;
	}

	async handleConfessionButton(
		client: DiscordClient<true>,
		interaction: ButtonInteraction,
	) {
		const matchCustomIdRegex = /(.*_confession)_(accept|reject|ban|edit)/gi;
		const regexMatches = matchCustomIdRegex.exec(interaction.customId);
		if (!regexMatches) return;

		const confessionId = regexMatches[1];
		const action = regexMatches[2];
		if (!confessionId || !action) return;

		const button = await ButtonInteractionCache.get(confessionId);
		if (!button || !button.guildId || !button.userHash) return;

		const guildPreferences = await GuildPreferencesCache.get(
			button.guildId,
		);
		if (
			!guildPreferences ||
			!guildPreferences.confessionApprovalChannelId ||
			!guildPreferences.confessionsChannelId
		)
			return;

		const approvalChannel = client.channels.cache.get(
			guildPreferences.confessionApprovalChannelId,
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
					guildPreferences.confessionsChannelId,
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
					content: "New Anonymous Confession",
				});

				const acceptEmbed = new EmbedBuilder()
					.setAuthor({
						name: `Confession accepted by ${interaction.user.tag}`,
					})
					.setDescription(confession)
					.setColor("Green");

				await message.edit({
					embeds: [acceptEmbed],
					components: [],
				});

				await interaction.reply({
					content: `Confession accepted, ${confessionMsg.url}`,
					flags: MessageFlags.Ephemeral,
				});

				break;
			}
			case "reject": {
				const rejectEmbed = new EmbedBuilder()
					.setAuthor({
						name: `Confession rejected by ${interaction.user.tag}`,
					})
					.setDescription(confession)
					.setColor("Red");

				await message.edit({
					embeds: [rejectEmbed],
					components: [],
				});

				await interaction.reply({
					content: "Confession rejected",
					flags: MessageFlags.Ephemeral,
				});

				break;
			}
			case "ban": {
				const modalCustomId = uuidv4();
				const modal = new ConfessionBanModal(modalCustomId);
				await interaction.showModal(modal);
				const modalResponse = await modal.waitForResponse(
					modalCustomId,
					interaction,
				);
				if (!modalResponse) return;

				const confessionBan = new ConfessionBan({
					userHash: button.userHash,
					guildId: button.guildId,
					reason: modalResponse.reason,
				});

				await confessionBan.save();

				const banEmbed = new EmbedBuilder()
					.setAuthor({
						name: `Confession rejected by ${interaction.user.tag} and user BANNED 🔨`,
					})
					.setDescription(confession)
					.setColor("Red")
					.addFields([
						{
							name: "Reason",
							value: modalResponse.reason,
						},
					]);

				await message.edit({
					embeds: [banEmbed],
					components: [],
				});

				await modalResponse.followUpInteraction.reply({
					content: "Confession rejected and user banned",
					flags: MessageFlags.Ephemeral,
				});

				break;
			}
			case "edit": {
				const confessInput = new TextInputBuilder()
					.setCustomId("edited_confession_input")
					.setLabel("Edited Confession")
					.setPlaceholder("The edited confession")
					.setValue(confession)
					.setRequired(true)
					.setStyle(TextInputStyle.Paragraph);

				const row =
					new ActionRowBuilder<TextInputBuilder>().addComponents(
						confessInput,
					);

				const modalCustomId = uuidv4();

				const modal = new ModalBuilder()
					.setCustomId(modalCustomId)
					.addComponents(row)
					.setTitle("Edited Confession");

				await interaction.showModal(modal);

				const modalInteraction = await interaction.awaitModalSubmit({
					time: 600_000,
					filter: (i) => i.customId === modalCustomId,
				});

				const editedConfession =
					modalInteraction.fields.getTextInputValue(
						"edited_confession_input",
					);

				if (confession === editedConfession) {
					await modalInteraction.reply({
						content:
							"Confession is the same as before, no changes made.",
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				const confirmationEmbed = new EmbedBuilder()
					.setTitle("Send edited confession")
					.setDescription(`${editedConfession}`)
					.setColor(Colors.Blurple);

				const buttonCustomId = uuidv4();

				const confirmButton = new ButtonBuilder()
					.setCustomId(`confirm_${buttonCustomId}`)
					.setLabel("Send")
					.setStyle(ButtonStyle.Success);

				const cancelButton = new ButtonBuilder()
					.setCustomId(`cancel_${buttonCustomId}`)
					.setLabel("Cancel")
					.setStyle(ButtonStyle.Danger);

				const confirmationRow =
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						confirmButton,
						cancelButton,
					);

				await modalInteraction.reply({
					embeds: [confirmationEmbed],
					components: [confirmationRow],
					flags: MessageFlags.Ephemeral,
				});

				if (!modalInteraction.channel) {
					return;
				}

				const buttonResponse =
					await modalInteraction.channel.awaitMessageComponent({
						filter: (i) => {
							i.deferUpdate();
							return (
								i.customId === `confirm_${buttonCustomId}` ||
								i.customId === `cancel_${buttonCustomId}`
							);
						},
						time: 300_000,
						componentType: ComponentType.Button,
					});

				if (buttonResponse.customId === `cancel_${buttonCustomId}`) {
					modalInteraction.editReply({
						embeds: [
							new EmbedBuilder()
								.setTitle("Confession Cancelled")
								.setDescription(editedConfession)
								.setColor("Red"),
						],
						components: [],
					});
					return;
				}

				modalInteraction.editReply({
					embeds: [
						new EmbedBuilder()
							.setTitle("Confession Sent")
							.setDescription(editedConfession)
							.setColor("Green"),
					],
					components: [],
				});

				const confessionsChannel = client.channels.cache.get(
					guildPreferences.confessionsChannelId,
				);
				if (
					!confessionsChannel ||
					!(confessionsChannel instanceof TextChannel)
				)
					return;

				const confessionEmbed = new EmbedBuilder()
					.setDescription(editedConfession)
					.setColor("Random");

				const confessionMsg = await confessionsChannel.send({
					embeds: [confessionEmbed],
					content: "New Anonymous Confession",
				});

				const acceptEmbed = new EmbedBuilder()
					.setAuthor({
						name: `Confession edited and sent by ${interaction.user.tag}`,
					})
					.addFields(
						{
							name: "Original Confession",
							value: confession,
						},
						{
							name: "Edited Confession",
							value: editedConfession,
						},
					)
					.setColor("Blurple");

				await message.edit({
					embeds: [acceptEmbed],
					components: [],
				});

				break;
			}
			default:
				break;
		}
		await ButtonInteractionCache.remove(confessionId);
	}

	async handleKeywordButtons(
		client: DiscordClient<true>,
		interaction: ButtonInteraction,
	) {
		if (!interaction.isButton()) return;
		if (interaction.customId === "keyword_search_send") {
			const message = interaction.message;
			await interaction.reply({
				embeds: [message.embeds[0]],
				ephemeral: false,
			});
			return;
		}
		const matchCustomIdRegex = /keyword_(accept|edited|reject)/gi;

		const regexMatches = matchCustomIdRegex.exec(interaction.customId);
		if (!regexMatches || !interaction.guildId) return;

		const embed = interaction.message.embeds[0];
		const matchUserIdRegex = /.*\ \((.*)\)/gi;
		const userId = matchUserIdRegex.exec(embed.footer?.text ?? "")?.[1]; // it's defo gonna match because of the footer is set
		if (!userId) return;
		const user = await client.users.fetch(userId);
		const keyword = embed.title?.trim().toLowerCase();
		const response = embed.description;
		const imageLink = embed.image?.url;
		if (!keyword || !response) return;
		let newEmbedColor: ColorResolvable = Colors.White;
		let moderatorAction = "";
		const modPfp = interaction.user.displayAvatarURL();
		switch (regexMatches[1]) {
			case "accept":
				await addKeyword(interaction, keyword, response, imageLink);
				await user.send(
					`Your keyword request, \`${keyword}\`, has been approved!`,
				);
				newEmbedColor = Colors.Green;
				moderatorAction = `Approved by ${interaction.user.tag}`;
				break;
			case "edited":
				await user.send(
					`Your keyword request, \`${keyword}\`, has been approved (slightly edited)!`,
				);
				await interaction.reply({
					content:
						"Sent dm message (you have to create the keyword yourself)",
					flags: MessageFlags.Ephemeral,
				});
				newEmbedColor = Colors.Yellow;
				moderatorAction = `Approved (edited) by ${interaction.user.tag}`;
				break;
			case "reject":
				await user.send(
					`Your keyword request, \`${keyword}\`, has been rejected!`,
				);
				await interaction.reply({
					content: "Sent rejection message",
					flags: MessageFlags.Ephemeral,
				});
				newEmbedColor = Colors.Red;
				moderatorAction = `Rejected by ${interaction.user.tag}`;
				break;
		}
		const modInfo = modPfp
			? { name: moderatorAction, iconURL: modPfp }
			: { name: moderatorAction };
		const newEmbed = new EmbedBuilder(embed.data)
			.setColor(newEmbedColor)
			.setAuthor(modInfo);
		await interaction.message.edit({ embeds: [newEmbed], components: [] });
	}

	async handleHostSessionButton(
		client: DiscordClient<true>,
		interaction: ButtonInteraction,
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
			button.guildId,
		);
		if (
			!guildPreferences ||
			!guildPreferences.hostSessionApprovalChannelId ||
			!guildPreferences.hostSessionChannelId
		)
			return;

		const approvalChannel = client.channels.cache.get(
			guildPreferences.hostSessionApprovalChannelId,
		);
		if (!approvalChannel || !(approvalChannel instanceof TextChannel))
			return;

		const message = await approvalChannel.messages.fetch(button.messageId);
		if (!message) return;

		const hostSession = await HostSession.findOne({
			messageId: button.messageId,
		});

		if (!hostSession) return;

		const teachers = hostSession.teachers;

		let acceptedSessionMessage = `<@&${hostSession.studyPingRoleId}>, there will be a study session hosted <t:${hostSession.startDate}:R> at <t:${hostSession.startDate}:t>, and will end on <t:${hostSession.endDate}:t>\nIt will be hosted by `;

		for (const teacherId of teachers) {
			acceptedSessionMessage += `<@${teacherId}> `;
		}

		acceptedSessionMessage += `\nThe following topics will be covered: ${hostSession.contents}`;

		const studyChannelDocument = await StudyChannel.findOne({
			studyPingRoleId: hostSession.studyPingRoleId,
		});
		if (!studyChannelDocument) return;
		const studyChannel = interaction.guild?.channels.cache.get(
			studyChannelDocument.channelId,
		);
		if (!studyChannel) return;

		const nameArray = studyChannel?.name.split("-");

		for (let i = 0; i < nameArray.length; i++) {
			const splitName = `${nameArray[i].substring(0, 1).toUpperCase()}${nameArray[i].substring(1)}`;
			nameArray[i] = splitName;
		}

		const name = `${nameArray.toString().replace(/,/g, " ").replace("Ig", "IGCSE").replace("As", "AS").replace("Al", "AL")} Hosted Study Session`;

		switch (action) {
			case "accept": {
				interaction.deferReply({ flags: MessageFlags.Ephemeral });

				const hostSessionChannel = client.channels.cache.get(
					guildPreferences.hostSessionChannelId,
				);
				if (
					!hostSessionChannel ||
					!(hostSessionChannel instanceof TextChannel)
				)
					return;

				const sessionChannel = await interaction.guild?.channels.create(
					{
						name,
						type: ChannelType.GuildStageVoice,
						permissionOverwrites: [
							{
								id: message.guild.roles.everyone.id,
								deny: PermissionFlagsBits.Connect,
							},
						],
					},
				);

				if (!sessionChannel) {
					interaction.editReply({
						content: "An error occurred",
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
					channel: sessionChannel,
				});

				if (!event) {
					interaction.editReply({
						content: "An error occurred",
					});

					return;
				}

				const eventLink = await event.createInviteURL();

				acceptedSessionMessage += `\n\n${eventLink}`;

				await hostSession.updateOne({
					accepted: true,
					channelId: sessionChannel.id,
					scheduledEventId: event.id,
				});

				await hostSessionChannel.send({
					content: acceptedSessionMessage,
				});

				const acceptEmbed = new EmbedBuilder()
					.setAuthor({
						name: `Session accepted by ${interaction.user.tag}`,
					})
					.setDescription(message.embeds[0].description)
					.setColor("Green");

				await message.edit({
					embeds: [acceptEmbed],
					components: [],
				});

				await interaction.editReply({
					content: "Session accepted",
				});
				break;
			}
			case "reject": {
				await hostSession.deleteOne();

				const rejectEmbed = new EmbedBuilder()
					.setAuthor({
						name: `Session rejected by ${interaction.user.tag}`,
					})
					.setDescription(message.embeds[0].description)
					.setColor("Red");

				await message.edit({
					embeds: [rejectEmbed],
					components: [],
				});

				await interaction.reply({
					content: "Session rejected",
					flags: MessageFlags.Ephemeral,
				});
				break;
			}
			default:
				break;
		}

		await ButtonInteractionCache.remove(regexMatches[1]);
	}
}
