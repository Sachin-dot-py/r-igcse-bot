import { Reputation, StickyMessage, type IStickyMessage } from "@/mongo";
import { GuildPreferencesCache, StickyMessageCache } from "@/redis";
import { EmbedBuilder, Events, Message } from "discord.js";
import { EntityId, type Entity } from "redis-om";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";

export default class MessageCreateEvent extends BaseEvent {
	constructor() {
		super(Events.MessageCreate);
	}

	async execute(client: DiscordClient<true>, message: Message) {
		if (message.author.bot) return;

		if (message.guild) {
			const guildPreferences = await GuildPreferencesCache.get(
				message.guild.id,
			);

			const keywords = (guildPreferences.keywords || []).filter(
				({ keyword }) => keyword === message.content.toLowerCase(),
			);

			if (keywords.length > 0) {
				message.reply(keywords[0].response);
			}

			if (message.reference && (guildPreferences.repEnabled ?? true))
				this.handleRep(
					message as Message<true>,
					guildPreferences?.repDisabledChannelIds || [],
				);

			if (client.stickyChannelIds.some((id) => id === message.channelId)) {
				if (!(client.stickyCounter[message.channelId] > 4)) {
					if (isNaN(client.stickyCounter[message.channelId]))
						client.stickyCounter[message.channelId] = 0;
					client.stickyCounter[message.channelId]++;
					return;
				}

				try {
					await this.handleStickyMessages(message as Message<true>);
				} catch (error) {
					console.error(error);
				}

				client.stickyCounter[message.channelId] = 0;
			}
		}
		// else
		// 	this.handleModMail(
		// 		message as Message<false>,
		// 		client.guilds.cache.get("894596848357089330")!,
		// 		"1204423423799988314",
		// 	);
	}

	// TODO: Redo Modmail
	// private async handleModMail(
	// 	message: Message<false>,
	// 	guild: Guild,
	// 	threadsChannelId: string,
	// ) {
	// 	const channel = guild.channels.cache.get(threadsChannelId);

	// 	if (!channel || !(channel instanceof TextChannel)) return;

	// 	const res = await PrivateDmThread.findOne({
	// 		userId: message.author.id,
	// 	}).exec();

	// 	let thread: ThreadChannel;

	// 	if (!res) {
	// 		thread = await channel.threads.create({
	// 			name: `${message.author.username} (${message.author.id})`,
	// 			type: ChannelType.PrivateThread,
	// 			startMessage: `Username: \`${message.author.username}\`\nUser ID: \`${message.author.id}\``,
	// 		});

	// 		await PrivateDmThread.create({
	// 			userId: message.author.id,
	// 			threadId: thread.id,
	// 		});
	// 	} else thread = channel.threads.cache.get(res.threadId)!;

	// 	const embed = new EmbedBuilder()
	// 		.setTitle("New DM Recieved")
	// 		.setAuthor({
	// 			name: message.author.username,
	// 			iconURL: message.author.displayAvatarURL(),
	// 		})
	// 		.setDescription(message.content)
	// 		.setTimestamp(message.createdTimestamp)
	// 		.setColor(Colors.Red);

	// 	thread.send({
	// 		embeds: [embed],
	// 	});
	// }

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
