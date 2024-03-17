import {
	PrivateDmThread,
	Reputation,
	StickyMessage,
	type IStickyMessage,
} from "@/mongo";
import { DmGuildPreference } from "@/mongo/schemas/DmGuildPreference";
import {
	DmGuildPreferenceCache,
	GuildPreferencesCache,
	StickyMessageCache,
} from "@/redis";
import {
	ActionRowBuilder,
	ChannelType,
	Colors,
	ComponentType,
	EmbedBuilder,
	Events,
	Message,
	StringSelectMenuBuilder,
	TextChannel,
	ThreadChannel,
} from "discord.js";
import { EntityId, type Entity } from "redis-om";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import Logger from "@/utils/Logger";
import DM from "@/utils/DM";

export default class MessageCreateEvent extends BaseEvent {
	constructor() {
		super(Events.MessageCreate);
	}

	async execute(client: DiscordClient<true>, message: Message) {
		if (message.author.bot) return;

		if (message.inGuild()) {
			const guildPreferences = await GuildPreferencesCache.get(
				message.guild.id,
			);

			if (!guildPreferences) return;

			const keywords = (guildPreferences.keywords || []).filter(
				({ keyword }) => keyword === message.content.toLowerCase(),
			);

			if (keywords.length > 0) {
				message.reply(keywords[0].response);
			}

			if (message.reference && (guildPreferences.repEnabled ?? true))
				this.handleRep(message, guildPreferences.repDisabledChannelIds || []);

			if (client.stickyChannelIds.some((id) => id === message.channelId)) {
				if (client.stickyCounter[message.channelId] <= 4) {
					client.stickyCounter[message.channelId] = ((x: number) =>
						(isNaN(x) ? 0 : x) + 1)(client.stickyCounter[message.channelId]);

					return;
				}

				try {
					await this.handleStickyMessages(message);
				} catch (error) {
					console.error(error);
				}

				client.stickyCounter[message.channelId] = 0;
			}

			if (message.channelId === guildPreferences.dmThreadsChannelId) {
				const user = await message.guild.members.fetch(message.content);

				if (!user) {
					await message.reply("Invalid User ID");
					return;
				}

				const res = await PrivateDmThread.findOne({
					userId: user.id,
				});

				if (res) {
					const thread = await message.guild.channels.fetch(res.threadId);

					if (thread) {
						await message.reply(
							`DM Thread with this user already exists: <#${thread.id}>`,
						);

						return;
					}
				}

				if (!(message.channel instanceof TextChannel)) {
					await message.reply("Invalid Channel Type  (must be a text channel)");
					return;
				}

				try {
					await message.channel.threads.create({
						name: user.id,
						startMessage: `Username: \`${user.displayName}\`\nUser ID: \`${user.id}\``,
					});
				} catch (error) {
					await message.reply("Unable to create thread");

					const embed = new EmbedBuilder()
						.setAuthor({
							name: "Failed: Create DM thread",
							iconURL: client.user.displayAvatarURL(),
						})
						.setDescription(`${error}`)
						.setTimestamp(Date.now());

					await Logger.channel(
						message.guild,
						guildPreferences.botlogChannelId,
						{
							embeds: [embed],
						},
					);
				}
			}

			// if (
			// 	message.content.includes("ban") &&
			// 	message.author.id === "604335693757677588" &&
			// 	message.reference
			// ) {
			// 	const reference = await message.fetchReference();

			// 	if (reference.author.id === "739852947571343492") return;

			// 	await message.guild.bans.create(reference.author, {
			// 		deleteMessageSeconds: 0,
			// 		reason: "because og",
			// 	});
			// }
		} else this.handleModMail(client, message as Message<false>);
	}

	private async handleModMail(
		client: DiscordClient<true>,
		message: Message<false>,
	) {
		let guildId = "";

		const cachedRes = await DmGuildPreferenceCache.get(message.author.id);

		if (cachedRes) guildId = cachedRes.guildId;
		else {
			const res = await DmGuildPreference.findOne({
				userId: message.author.id,
			});

			if (res) guildId = res.guildId;
			else {
				const guildSelect = new StringSelectMenuBuilder()
					.setCustomId("dm-guild-select")
					.setMinValues(1)
					.setMaxValues(1)
					.addOptions(
						client.guilds.cache.filter(guild => {
							guild.members.cache.has(message.author.id);
						}).map((guild) => ({
							label: guild.name,
							value: guild.id,
						})),
					);

				const row =
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						guildSelect,
					);

				const { awaitMessageComponent } = await message.author.send({
					components: [row],
				});

				awaitMessageComponent({
					componentType: ComponentType.StringSelect,
					filter: (i) => i.customId === "dm-guild-select",
				})
					.then(async (i) => {
						await DmGuildPreference.create({
							userId: message.author.id,
							guildId: i.values[0],
						});
					})
					.catch(console.error);
			}

			await DmGuildPreferenceCache.set(message.author.id, guildId);
		}

		const guild = client.guilds.cache.get(guildId);

		if (!guild) return;

		const guildPreferences = await GuildPreferencesCache.get(guildId);

		if (!guildPreferences) return;

		const channel = guild.channels.cache.get(guildPreferences.modmailChannelId);

		if (!channel || !(channel instanceof TextChannel)) return;
		const res = await PrivateDmThread.findOne({
			userId: message.author.id,
		}).exec();

		let thread: ThreadChannel;

		if (!res) {
			thread = await channel.threads.create({
				name: `${message.author.username} (${message.author.id})`,
				type: ChannelType.PrivateThread,
				startMessage: `Username: \`${message.author.username}\`\nUser ID: \`${message.author.id}\``,
			});
			await PrivateDmThread.create({
				userId: message.author.id,
				threadId: thread.id,
			});
		} else thread = channel.threads.cache.get(res.threadId)!;

		const embed = new EmbedBuilder()
			.setTitle("New DM Recieved")
			.setAuthor({
				name: message.author.username,
				iconURL: message.author.displayAvatarURL(),
			})
			.setDescription(message.content)
			.setTimestamp(message.createdTimestamp)
			.setColor(Colors.Red);

		thread.send({
			embeds: [embed],
		});
	}

	private async handleRep(
		message: Message<true>,
		repDisabledChannels: string[],
	) {
		const referenceMessage = await message.fetchReference();

		if (
			!referenceMessage.author.bot &&
			!(referenceMessage.author.id === message.author.id)
		) {
			const channelId =
				message.channel.isThread() && !message.channel.isThreadOnly()
					? message.channel.parentId
					: message.channelId;

			if (!repDisabledChannels.some((id) => id === channelId)) {
				const rep = [];

				if (
					[
						"you're welcome",
						"ur welcome",
						"yw",
						"no problem",
						"np",
						"no worries",
						"nw",
					].some((phrase) => message.content.toLowerCase().includes(phrase))
				)
					rep.push(message.author);

				if (
					[
						"ty",
						"thanks",
						"thank you",
						"thx",
						"tysm",
						"thank u",
						"thnks",
						"thanku",
						"tyvm",
						"tq",
					].some((phrase) => message.content.toLowerCase().includes(phrase))
				)
					rep.push(referenceMessage.author);

				for (const user of rep) {
					const member = await message.guild.members.fetch(user.id);

					if (!member) return;

					const res = await Reputation.findOneAndUpdate(
						{
							guildId: message.guildId,
							userId: member.id,
						},
						{
							$inc: {
								rep: 1,
							},
						},
						{
							upsert: true,
						},
					).exec();

					if (!res) return;

					const rep = res.rep;

					let content = `Gave +1 Rep to <@${member.id}> (${rep})`;

					if ([100, 500, 1000, 5000].some((amnt) => rep === amnt)) {
						const role = message.guild.roles.cache.get(`${rep}+ Rep Club`);

						if (!role) return;

						content += `\nWelcome to the ${role.name}`;
						member.roles.add(role);
					}

					message.channel.send(content);
				}
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
					stickyMessage.messageId,
				);

				if (oldSticky) await oldSticky.delete();
			}

			const embeds = (stickyMessage.embeds as string[]).map(
				(embed) => new EmbedBuilder(JSON.parse(embed)),
			);

			const newSticky = await message.channel.send({
				embeds,
			});

			await StickyMessage.findOneAndUpdate(
				{
					id: stickyMessage[EntityId]!,
				},
				{
					$set: {
						messageId: newSticky.id,
					},
				},
			);

			await StickyMessageCache.set(stickyMessage[EntityId]!, {
				...stickyMessage,
				embeds: stickyMessage.embeds.map((embed) => JSON.parse(embed)),
				messageId: newSticky.id,
			});
		}
	}
}
