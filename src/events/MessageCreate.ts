import { GuildPreferences, PrivateDmThread, Reputation } from "@/mongo";
import {
	ChannelType,
	Colors,
	EmbedBuilder,
	Events,
	Guild,
	Message,
	TextChannel,
	ThreadChannel,
} from "discord.js";
import BaseEvent from "../registry/Structure/BaseEvent";
import type { DiscordClient } from "../registry/client";

export default class MessageCreateEvent extends BaseEvent {
	constructor() {
		super(Events.MessageCreate);
	}

	async execute(client: DiscordClient, message: Message) {
		if (message.author.bot) return;

		if (message.guild) {
			const guildPreferences = await GuildPreferences.findOne({
				guildId: message.guildId,
			}).exec();

			if (message.reference && (guildPreferences?.repEnabled || true))
				this.handleRep(message, guildPreferences?.repDisabledChannelIds || []);
		} else
			this.handleModMail(
				message,
				client.guilds.cache.get("894596848357089330")!,
				"1204423423799988314",
			);
	}

	// TODO: Logging
	private async handleModMail(
		message: Message,
		guild: Guild,
		threadsChannelId: string,
	) {
		const channel = guild.channels.cache.get(threadsChannelId);

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

	// TODO: Refactor reputation system
	private async handleRep(message: Message, repDisabledChannels: string[]) {
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
						"you're welcome", // 'your welcome',
						"ur welcome",
						"no problem",
						"np",
						"yw",
					].some((phrase) => message.content.toLowerCase().includes(phrase))
				)
					rep.push(message.author);

				if (
					[
						"ty",
						"thanks",
						"thank",
						"thank you",
						"thx",
						"tysm",
						"thank u",
						"thnks",
						"tanks",
						"thanku",
						"tyvm",
						"thankyou",
					].some((phrase) => message.content.toLowerCase().includes(phrase))
				)
					rep.push(referenceMessage.author);

				for (const user of rep) {
					const member = await message.guild?.members.fetch(user.id);

					if (member) {
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

						const rep = res?.rep;

						if ([100, 500, 1000, 5000].some((amnt) => rep === amnt)) {
							const role = message.guild?.roles.cache.get(`${rep}+ Rep Club`);
							message.channel.send(
								`Gave +1 Rep to <@${member.id}> (${rep})${role ? `\nWelcome to the ${role.name}` : ""}`,
							);

							if (role) member.roles.add(role);
						}
					}
				}
			}
		}
	}
}
