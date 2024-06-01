import Select from "@/components/Select";
import Buttons from "@/components/practice/views/Buttons";
import { botYwResponses, tyAliases, ywAliases } from "@/data";
import { PrivateDmThread, Reputation } from "@/mongo";
import { DmGuildPreference } from "@/mongo/schemas/DmGuildPreference";
import {
	GuildPreferencesCache,
	KeywordCache,
	StickyMessageCache
} from "@/redis";
import type { ICachedStickyMessage } from "@/redis/schemas/StickyMessage";
import Logger from "@/utils/Logger";
import sendDm from "@/utils/sendDm";
import {
	ActionRowBuilder,
	ButtonBuilder,
	Colors,
	EmbedBuilder,
	Events,
	ForumChannel,
	Message,
	StringSelectMenuOptionBuilder,
	ThreadChannel,
	User,
	type APIEmbed,
	type MessageCreateOptions
} from "discord.js";
import { v4 as uuidv4 } from "uuid";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import { EntityId, type Entity } from "redis-om";

const stickyCounter: Record<string, number> = {};

export default class MessageCreateEvent extends BaseEvent {
	constructor() {
		super(Events.MessageCreate);
	}

	async execute(client: DiscordClient<true>, message: Message) {
		if (message.author.bot) return;

		if (message.inGuild()) {
			KeywordCache.get(
				message.guildId,
				message.content.trim().toLowerCase()
			)
				.then((keywordReponse) => {
					if (
						keywordReponse &&
						!keywordReponse.startsWith("https://") &&
						!keywordReponse.startsWith("http://")
					) {
						const embed = new EmbedBuilder()
							.setDescription(keywordReponse)
							.setFooter({
								text: `Requested by ${message.author.tag}`
							})
							.setColor(Colors.Blue);
						message.channel.send({ embeds: [embed] });
					} else if (keywordReponse) {
						message.channel.send(keywordReponse);
					}
				})
				.catch(Logger.error);

			const guildPreferences = await GuildPreferencesCache.get(
				message.guild.id
			);

			if (!guildPreferences) return;

			if (
				guildPreferences.countingChannelId &&
				message.channel.id === guildPreferences.countingChannelId
			) {
				const countingChannel = message.guild.channels.cache.get(
					guildPreferences.countingChannelId
				);

				if (!countingChannel || !countingChannel.isTextBased()) return;

				const lastMessage = [
					...(
						await countingChannel.messages.fetch({
							before: message.id,
							limit: 1
						})
					).values()
				][0];

				if (
					((!lastMessage && message.content === "1") ||
						(lastMessage &&
							`${parseInt(lastMessage.content) + 1}` ===
								message.content)) &&
					lastMessage.author.id !== message.author.id
				)
					message.react("✅");
				else message.delete();
			}

			if (guildPreferences.repEnabled)
				this.handleRep(
					client,
					message,
					guildPreferences.repDisabledChannelIds
				);

			if (client.stickyChannelIds.includes(message.channelId)) {
				if (
					stickyCounter[message.channelId] === 4 &&
					stickyCounter[message.channelId] >= 4
				) {
					this.handleStickyMessages(message).catch((e) =>
						Logger.error(`Error at handleStickyMessages: ${e}`)
					);
					stickyCounter[message.channelId] = 0;
				} else {
					stickyCounter[message.channelId] = ((x: number) =>
						(isNaN(x) ? 0 : x) + 1)(
						stickyCounter[message.channelId]
					);
				}
			}

			if (message.channelId === guildPreferences.modmailCreateChannelId) {
				if (
					!guildPreferences.modmailThreadsChannelId ||
					!guildPreferences.modmailCreateChannelId
				) {
					await message.reply(
						"Modmail is not set up in this server."
					);
					return;
				}

				const member = await message.guild.members
					.fetch(message.content)
					.catch(async () => {
						await message.reply("Invalid User ID");
						return;
					});

				if (!member) return;

				const res = await PrivateDmThread.findOne({
					userId: member.id,
					guildId: message.guild.id
				});

				if (res) {
					const thread = await message.guild.channels
						.fetch(res.threadId)
						.catch(async () => {
							await PrivateDmThread.deleteMany({
								userId: member.id,
								guildId: message.guild.id
							});
							await message.reply(
								"Thread not found (could've been manually deleted), please try again to create a new thread."
							);
							return;
						});

					if (thread) {
						await message.reply(
							`DM Thread with this user already exists: <#${thread.id}>`
						);

						return;
					}
				}

				const threadsChannel = message.guild.channels.cache.get(
					guildPreferences.modmailThreadsChannelId
				);

				if (
					!threadsChannel ||
					!(threadsChannel instanceof ForumChannel)
				) {
					await message.reply(
						`Threads channel (${threadsChannel}) should be a forum channel.`
					);
					return;
				}

				try {
					const newThread = await threadsChannel.threads.create({
						name: `${member.user.tag} (${member.id})`,
						message: {
							content: `Username: \`${member.user.tag}\`\nUser ID: \`${member.id}\``
						}
					});

					await PrivateDmThread.create({
						userId: member.id,
						threadId: newThread.id,
						guildId: message.guild.id
					});

					await message.reply(
						`Created dm thread for user at <#${newThread.id}>.`
					);
				} catch (error) {
					await message.reply("Unable to create thread");

					client.log(
						error,
						`Create DM Thread`,
						`**Channel:** <#${message.channel?.id}>
							**User:** <@${message.author.id}>
							**Guild:** ${message.guild.name} (${message.guildId})\n`
					);
				}
			}
			if (
				message.channel instanceof ThreadChannel &&
				message.channel.parentId ===
					guildPreferences.modmailThreadsChannelId
			) {
				this.handleModMailReply(client, message as Message<true>);
			}
		} else this.handleModMail(client, message as Message<false>);
	}

	private async handleModMail(
		client: DiscordClient<true>,
		message: Message<false>
	) {
		let guildId = "";

		const dmPreference = await DmGuildPreference.findOne({
			userId: message.author.id
		});

		if (dmPreference) guildId = dmPreference.guildId;
		else {
			const guilds = client.guilds.cache.filter((guild) =>
				guild.members.cache.has(message.author.id)
			);
			if (guilds.size === 0) {
				await message.author.send(
					"Hey there, please send a message in the server you're trying to contact and then try again."
				);
				return;
			}
			const selectCustomId = uuidv4();
			const guildSelect = new Select(
				"guildSelect",
				"Select a server",
				guilds.map((guild) => {
					return new StringSelectMenuOptionBuilder()
						.setLabel(guild.name)
						.setValue(guild.id);
				}),
				1,
				`${selectCustomId}_0`
			);

			const row = new ActionRowBuilder<Select>().addComponents(
				guildSelect
			);

			const selectInteraction = await message.author.send({
				content: `Welcome to Modmail! Please select a server to contact using the dropdown menu below.
If you don't see the server you're looking for, please send a message in that server and try again.

To change the server you're contacting, use the \`/swap\` command`,
				components: [
					row,
					new Buttons(
						selectCustomId
					) as ActionRowBuilder<ButtonBuilder>
				]
			});

			const guildResponse = await guildSelect.waitForResponse(
				`${selectCustomId}_0`,
				selectInteraction,
				selectInteraction,
				true
			);

			if (!guildResponse || guildResponse === "Timed out") return;
			const guild = client.guilds.cache.get(guildResponse[0]);

			if (!guild) {
				await selectInteraction.edit({
					content: "Invalid Server",
					components: []
				});
				return;
			}

			await selectInteraction.edit({
				content: `Server ${guild.name} selected.`,
				components: []
			});

			guildId = guildResponse[0];

			await DmGuildPreference.create({
				userId: message.author.id,
				guildId: guildId
			});
		}

		const guild = client.guilds.cache.get(guildId);
		if (!guild) return;

		const guildPreferences = await GuildPreferencesCache.get(guildId);

		if (!guildPreferences || !guildPreferences.modmailThreadsChannelId) {
			await message.author.send(
				`Modmail is not set up in **${guild.name}**`
			);
			return;
		}

		const channel = guild.channels.cache.get(
			guildPreferences.modmailThreadsChannelId
		);

		if (!channel || !(channel instanceof ForumChannel)) {
			await message.author.send(
				`Unable to find the modmail channel in **${guild.name}**. Please contact the server staff.`
			);
			return;
		}
		const res = await PrivateDmThread.findOne({
			userId: message.author.id,
			guildId
		});

		let thread: ThreadChannel;

		if (!res) {
			thread = await channel.threads.create({
				name: `${message.author.username} (${message.author.id})`,
				message: {
					content: `Username: \`${message.author.tag}\`\nUser ID: \`${message.author.id}\``
				}
			});
			await PrivateDmThread.create({
				userId: message.author.id,
				threadId: thread.id,
				guildId
			});
		} else thread = channel.threads.cache.get(res.threadId)!;

		const embed = new EmbedBuilder()
			.setTitle("New DM Recieved")
			.setAuthor({
				name: message.author.username,
				iconURL: message.author.displayAvatarURL()
			})
			.setDescription(message.content || "No content")
			.setTimestamp(message.createdTimestamp)
			.setColor(Colors.Red);

		if (message.attachments.size > 0) {
			embed.addFields({
				name: "Attachments",
				value: message.attachments
					.map(
						(attachment) =>
							`[${attachment.name}](${attachment.url})`
					)
					.join("\n")
			});
		}

		if (guildPreferences.modmailLogsChannelId) {
			Logger.channel(guild, guildPreferences.modmailLogsChannelId, {
				embeds: [
					{
						title: "New DM Recieved",
						description: `**User:** ${message.author.tag} (${message.author.id})\n**Thread:** <#${thread.id}>`,
						color: Colors.Purple,
						timestamp: new Date().toISOString()
					}
				]
			});
		}

		thread.send({
			embeds: [embed]
		});

		await message.react("✅");
	}

	private async handleModMailReply(
		client: DiscordClient<true>,
		message: Message<true>
	) {
		if (message.content.startsWith("//")) {
			await message.react("👀");
			return;
		}

		const dmThread = await PrivateDmThread.findOne({
			threadId: message.channel.id
		});

		if (!dmThread) {
			await message.reply("Unable to find the user for this thread.");
			return;
		}

		const member = await message.guild.members
			.fetch(dmThread.userId)
			.catch(async () => {
				await message.reply("User is no longer in the server");
				return;
			});
		if (!member) return;

		const embed = new EmbedBuilder()
			.setTitle(`Message from ${message.guild.name} Staff`)
			.setAuthor({
				name: message.author.username,
				iconURL: message.author.displayAvatarURL()
			})
			.setDescription(message.content || "No content")
			.setTimestamp(message.createdTimestamp)
			.setColor(Colors.Green);

		if (message.attachments.size > 0) {
			embed.addFields({
				name: "Attachments",
				value: message.attachments
					.map(
						(attachment) =>
							`[${attachment.name}](${attachment.url})`
					)
					.join("\n")
			});
		}

		await sendDm(member, {
			embeds: [embed]
		});

		await message.react("✅");
	}

	private async handleRep(
		client: DiscordClient<true>,
		message: Message<true>,
		repDisabledChannels: string[]
	) {
		const channelId =
			(message.channel.isThread() && !message.channel.isThreadOnly()
				? message.channel.parentId
				: message.channelId) ?? "";

		if (repDisabledChannels.includes(channelId)) return;

		for (const user of await this.getReppedUsers(client, message)) {
			if (user.id === client.user.id) {
				await message.reply(
					botYwResponses[
						Math.floor(Math.random() * botYwResponses.length)
					]
				);

				continue;
			}

			const member = await message.guild.members.fetch(user.id);

			if (!member) return;

			let rep = 1;

			const res = await Reputation.findOneAndUpdate(
				{
					guildId: message.guildId,
					userId: member.id
				},
				{
					$inc: {
						rep: 1
					}
				}
			);

			if (res) rep = res.rep + 1;
			else
				await Reputation.create({
					guildId: message.guildId,
					userId: member.id,
					rep: 1
				});

			let content = `Gave +1 Rep to <@${user.id}> (${rep})`;

			if ([100, 500, 1000, 5000, 10000].some((amnt) => rep === amnt)) {
				const role = message.guild.roles.cache.find(
					(x) => x.name === `${rep}+ Rep Club`
				);

				if (role) {
					content += `\nWelcome to the ${role.name}`;
					member.roles.add(role);
				}
			}

			message.channel.send({
				content,
				allowedMentions: { repliedUser: false }
			});
		}
	}

	private async getReppedUsers(
		client: DiscordClient<true>,
		message: Message
	) {
		const users = new Set<User>();

		if (
			tyAliases.some((alias) =>
				new RegExp(`\\b${alias}\\b`, "gi").test(message.content)
			)
		) {
			for (const user of message.mentions.users.values())
				if (message.author.id === user.id)
					message.reply("You can't rep yourself dummy!");
				else if (user.bot) message.reply("Uh-oh, you can't rep a bot");
				else users.add(user);

			if (message.reference) {
				const reference = await message.fetchReference();

				if (message.author.id === reference.author.id)
					message.reply("You can't rep yourself dummy!");
				else if (reference.author.bot)
					message.reply("Uh-oh, you can't rep a bot");
				else users.add(reference.author);
			}
		} else if (
			message.reference &&
			ywAliases.some((alias) =>
				new RegExp(`\\b${alias}\\b`, "gi").test(message.content)
			)
		) {
			const reference = await message.fetchReference();

			if (reference.author.id === message.author.id)
				message.reply("You can't rep yourself dummy!");
			else if (reference.author.id === client.user.id)
				message.reply("I never said thanks");
			else if (reference.author.bot)
				message.reply("Uh-oh, you can't get rep from a bot");
			else {
				const referenceRepped = await this.getReppedUsers(
					client,
					reference
				);

				if (!referenceRepped.has(message.author))
					users.add(message.author);
			}
		}

		return users;
	}

	private async handleStickyMessages(message: Message<true>) {
		const stickyMessages = (await StickyMessageCache.search()
			.where("channelId")
			.equals(message.channelId)
			.returnAll()
			.catch(() => [])) as ICachedStickyMessage[];

		for (const stickyMessage of stickyMessages) {
			if (stickyMessage.messageId) {
				await message.channel.messages
					.delete(stickyMessage.messageId)
					.catch(() => {});
			}

			const newSticky = await message.channel.send({
				content: ((x) => (x === "" ? undefined : x))(
					stickyMessage.message.content
				),
				embeds: stickyMessage.message.embeds as APIEmbed[]
			});

			stickyMessage.messageId = newSticky.id;
			await StickyMessageCache.save(stickyMessage);
		}
	}
}
