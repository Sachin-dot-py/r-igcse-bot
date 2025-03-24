import { ForcedMute } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import sendDm from "@/utils/sendDm";
import { Logger } from "@discordforge/logger";
import {
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import parse from "parse-duration";

export default class GoStudyCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("gostudy")
				.setDescription(
					"Restricts access to off-topic channels so you can study in peace.",
				)
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User to timeout (for mods)")
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName("duration")
						.setDescription(
							"Duration for gostudy (default: 1 hour)",
						)
						.setRequired(false),
				)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		let user = interaction.options.getUser("user", false);
		const durationString =
			interaction.options.getString("duration", false) ?? "1 hour";

		if (
			user &&
			interaction.user.id !== user.id &&
			!interaction.member.permissions.has(
				PermissionFlagsBits.ModerateMembers,
			)
		) {
			await interaction.reply({
				content: "You do not have permission to gostudy other users.",
				ephemeral: true,
			});

			return;
		}

		if (!user) {
			user = interaction.user;
		}

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);

		if (!guildPreferences || !guildPreferences.forcedMuteRoleId) {
			await interaction.reply({
				content:
					"Please setup the bot using the command `/setup` first.",
				ephemeral: true,
			});
			return;
		}

		const duration = ["unspecified", "permanent", "undecided"].some((s) =>
			durationString.includes(s),
		)
			? 2419200
			: (parse(durationString, "second") ?? 86400);

		if (duration <= 0) {
			await interaction.reply({
				content: "Invalid duration!",
				ephemeral: true,
			});

			return;
		}

		const member = await interaction.guild.members.fetch(user.id);

		if (!member) {
			await interaction.reply({
				content: "Invalid user!",
				ephemeral: true,
			});

			return;
		}

		const role = interaction.guild.roles.cache.get(
			guildPreferences.forcedMuteRoleId,
		);

		if (!role) {
			await interaction.reply({
				content: "Forced mute role not found!",
				ephemeral: true,
			});

			return;
		}

		await interaction.deferReply({ ephemeral: true });

		const expiration = new Date(Date.now() + duration * 1000);

		const alreadyMuted = await ForcedMute.findOne({
			userId: user.id,
			guildId: interaction.guildId,
		});

		if (alreadyMuted?.expiration && alreadyMuted.expiration > expiration) {
			await interaction.editReply({
				content:
					"You cannot reduce the duration of an existing forced mute! Feel free to extend it though.",
			});

			return;
		}

		if (alreadyMuted) {
			await alreadyMuted.deleteOne();
		}

		try {
			await member.roles.add(role);
		} catch (error) {
			client.log(
				error,
				`${this.data.name} Command (adding role)`,
				`**Channel:** <#${interaction.channel?.id}>
					**User:** <@${interaction.user.id}>
					**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
			);
			Logger.error(error);
		}

		await new ForcedMute({
			userId: user.id,
			guildId: interaction.guildId,
			expiration,
		}).save();

		const dmEmbed = new EmbedBuilder()
			.setTitle(`It's time to study!`)
			.setDescription(
				`Time to study! You've been given a temporary break from the off-topic channels${user.id !== interaction.user.id ? ` thanks to ${interaction.user.tag}` : ""}. You'll be given access to off-topic channels again <t:${Math.floor(expiration.getTime() / 1000)}:R>`,
			)
			.setFooter({
				text: `From ${interaction.guild.name}`,
			})
			.setColor("Random");

		await sendDm(member, {
			embeds: [dmEmbed],
		});

		await interaction.editReply({
			content: `Alright, you can study in peace now, make sure to actually study though. You'll be given access to off-topic channels again <t:${Math.floor(expiration.getTime() / 1000)}:R>`,
		});
	}

	async expireForcedMute(client: DiscordClient<true>) {
		const expiredMutes = await ForcedMute.find({
			expiration: { $lte: new Date() },
		});

		for (const mute of expiredMutes) {
			const guild = await client.guilds
				.fetch(mute.guildId)
				.catch((x) => null);

			if (!guild) {
				await mute.deleteOne();
				continue;
			}

			const member = await guild.members
				.fetch(mute.userId)
				.catch((x) => null);

			if (!member) {
				await mute.deleteOne();
				continue;
			}

			const guildPreferences = await GuildPreferencesCache.get(guild.id);

			if (!guildPreferences || !guildPreferences.forcedMuteRoleId) {
				await mute.deleteOne();
				continue;
			}

			const role = guild.roles.cache.get(
				guildPreferences.forcedMuteRoleId,
			);

			if (!role) {
				await mute.deleteOne();
				continue;
			}

			try {
				await member.roles.remove(role);
			} catch (error) {
				client.log(
					error,
					`${this.data.name} Command (removing role)`,
					`**User:** <@${member.id}>
						**Guild:** ${guild.name} (${guild.id})\n`,
				);
				Logger.error(error);
			}

			await mute.deleteOne();
		}
	}
}
