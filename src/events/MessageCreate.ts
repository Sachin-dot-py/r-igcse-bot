import Select from "@/components/Select";
import Buttons from "@/components/practice/views/Buttons";
import {
	PrivateDmThread,
	Reputation,
	StickyMessage,
	type IStickyMessage
} from "@/mongo";
import { DmGuildPreference } from "@/mongo/schemas/DmGuildPreference";
import {
	DmGuildPreferenceCache,
	GuildPreferencesCache,
	KeywordCache,
	StickyMessageCache
} from "@/redis";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ChannelType,
	Colors,
	EmbedBuilder,
	Events,
	Message,
	StringSelectMenuOptionBuilder,
	TextChannel,
	ThreadChannel,
	User
} from "discord.js";
import { EntityId, type Entity } from "redis-om";
import { v4 as uuidv4 } from "uuid";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import { tyAliases, ywAliases } from "@/data";

export default class MessageCreateEvent extends BaseEvent {
	constructor() {
		super(Events.MessageCreate);
	}

	async execute(client: DiscordClient<true>, message: Message) {
		if (message.author.bot) return;

		if (message.inGuild()) {
			const keywordReponse = await KeywordCache.get(
				message.guildId,
				message.content.trim().toLowerCase()
			);

			if (keywordReponse) message.reply(keywordReponse);

			const guildPreferences = await GuildPreferencesCache.get(
				message.guild.id
			);

			if (!guildPreferences) return;

			if (guildPreferences.repEnabled)
				this.handleRep(message, guildPreferences.repDisabledChannelIds);

			if (
				client.stickyChannelIds.some((id) => id === message.channelId)
			) {
				if (client.stickyCounter[message.channelId] <= 4) {
					client.stickyCounter[message.channelId] = ((x: number) =>
						(isNaN(x) ? 0 : x) + 1)(
						client.stickyCounter[message.channelId]
					);

					return;
				}

				try {
					await this.handleStickyMessages(message);
				} catch (error) {
					console.error(error);
				}

				client.stickyCounter[message.channelId] = 0;
			}

			if (message.channelId === guildPreferences.modmailCreateChannelId) {
				const member = await message.guild.members.fetch(
					message.content
				);

				if (!member) {
					await message.reply("Invalid User ID");
					return;
				}

				const res = await PrivateDmThread.findOne({
					userId: member.id
				});

				if (res) {
					const thread = await message.guild.channels.fetch(
						res.threadId
					);

					if (thread) {
						await message.reply(
							`DM Thread with this user already exists: <#${thread.id}>`
						);

						return;
					}
				}

				if (!(message.channel instanceof TextChannel)) {
					await message.reply(
						"Invalid Channel Type  (must be a text channel)"
					);
					return;
				}

				try {
					await message.channel.threads.create({
						name: member.id,
						startMessage: `Username: \`${member.user.tag}\`\nUser ID: \`${member.id}\``
					});
				} catch (error) {
					await message.reply("Unable to create thread");

					client.log(error, `Create DM Thread`, [
						{ name: "User ID", value: message.author.id }
					]);
				}
			}
		} else this.handleModMail(client, message as Message<false>);
	}

	private async handleModMail(
		client: DiscordClient<true>,
		message: Message<false>
	) {
		let guildId = "";

		const cachedRes = await DmGuildPreferenceCache.get(message.author.id);

		if (cachedRes) guildId = cachedRes.guildId;
		else {
			const res = await DmGuildPreference.findOne({
				userId: message.author.id
			});

			if (res) guildId = res.guildId;
			else {
				const guilds = client.guilds.cache.filter((guild) =>
					guild.members.cache.has(message.author.id)
				);
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
					selectCustomId
				);

				const row = new ActionRowBuilder<Select>().addComponents(
					guildSelect
				);

				const selectInteraction = await message.author.send({
					content: "Select a server to send a message to",
					components: [
						row,
						new Buttons(
							selectCustomId
						) as ActionRowBuilder<ButtonBuilder>
					]
				});

				const guildResponse = await guildSelect.waitForResponse(
					selectCustomId,
					selectInteraction,
					message,
					true
				);

				if (!guildResponse || guildResponse === "Timed out") return;

				await selectInteraction.reply({
					content: `Server ${guildResponse[0]} selected.`
				});

				guildId = guildResponse[0];

				await DmGuildPreference.create({
					userId: message.author.id,
					guildId: guildId
				});
			}

			await DmGuildPreferenceCache.set(message.author.id, guildId);
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

		if (!channel || !(channel instanceof TextChannel)) return;
		const res = await PrivateDmThread.findOne({
			userId: message.author.id
		});

		let thread: ThreadChannel;

		if (!res) {
			thread = await channel.threads.create({
				name: `${message.author.username} (${message.author.id})`,
				type: ChannelType.PrivateThread,
				startMessage: `Username: \`${message.author.tag}\`\nUser ID: \`${message.author.id}\``
			});
			await PrivateDmThread.create({
				userId: message.author.id,
				threadId: thread.id
			});
		} else thread = channel.threads.cache.get(res.threadId)!;

		const embed = new EmbedBuilder()
			.setTitle("New DM Recieved")
			.setAuthor({
				name: message.author.username,
				iconURL: message.author.displayAvatarURL()
			})
			.setDescription(message.content)
			.setTimestamp(message.createdTimestamp)
			.setColor(Colors.Red);

		thread.send({
			embeds: [embed]
		});
	}

	private async handleRep(
		message: Message<true>,
		repDisabledChannels: string[]
	) {
		const channelId =
			message.channel.isThread() && !message.channel.isThreadOnly()
				? message.channel.parentId
				: message.channelId;

		if (!repDisabledChannels.some((id) => id === channelId)) {
			const rep: User[] = [];

			if (tyAliases.some((alias) => message.content.includes(alias))) {
				rep.push(...message.mentions.users.values());
				if (message.reference)
					rep.push((await message.fetchReference()).author);
			}

			if (
				message.reference &&
				ywAliases.some((alias) => message.content.includes(alias))
			)
				rep.push(message.author);

			for (const user of rep) {
				const member = await message.guild.members.fetch(user.id);

				if (!member) return;

				const res =
					(await Reputation.findOneAndUpdate(
						{
							guildId: message.guildId,
							userId: member.id
						},
						{
							$inc: {
								rep: 1
							}
						}
					)) ??
					(await Reputation.create({
						guildId: message.guildId,
						userId: member.id,
						rep: 1
					}));

				if (!res) return;

				const rep = res.rep;

				let content = `Gave +1 Rep to ${user.tag} (${rep})`;

				if ([100, 500, 1000, 5000].some((amnt) => rep === amnt)) {
					const role = message.guild.roles.cache.get(
						`${rep}+ Rep Club`
					);

					if (!role) return;

					content += `\nWelcome to the ${role.name}`;
					member.roles.add(role);
				}

				message.channel.send(content);
			}
		}
	}

	private async handleStickyMessages(message: Message<true>) {
		const stickyMessages = (await StickyMessageCache.search()
			.where("channelId")
			.equals(message.channelId)
			.returnAll()) as (Omit<IStickyMessage, "embeds"> & {
			embeds: string[];
		} & Entity)[];

		for (const stickyMessage of stickyMessages) {
			if (!stickyMessage.enabled) return;

			if (stickyMessage.messageId) {
				const oldSticky = await message.channel.messages.cache.get(
					stickyMessage.messageId
				);

				if (oldSticky) await oldSticky.delete();
			}

			const embeds = (stickyMessage.embeds as string[]).map(
				(embed) => new EmbedBuilder(JSON.parse(embed))
			);

			const newSticky = await message.channel.send({
				embeds
			});

			await StickyMessage.findOneAndUpdate(
				{
					id: stickyMessage[EntityId]!
				},
				{
					$set: {
						messageId: newSticky.id
					}
				}
			);

			await StickyMessageCache.set(stickyMessage[EntityId]!, {
				...stickyMessage,
				embeds: stickyMessage.embeds.map((embed) => JSON.parse(embed)),
				messageId: newSticky.id
			});
		}
	}
}
