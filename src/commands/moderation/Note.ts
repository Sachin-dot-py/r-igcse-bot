import Select from "@/components/Select";
import Buttons from "@/components/practice/views/Buttons";
import { ModNote } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { logToChannel } from "@/utils/Logger";
import {
	Colors,
	ActionRowBuilder,
	type ButtonBuilder,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	MessageFlags,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";

export default class NoteCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("note")
				.setDescription("Add a note to a user (for mods)")
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ModerateMembers,
				)
				.setDMPermission(false)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("add")
						.setDescription("Add a note to a user")
						.addUserOption((option) =>
							option
								.setName("user")
								.setDescription("User to add a note to")
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("note")
								.setDescription("The note you want to add")
								.setRequired(true),
						),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("delete")
						.setDescription("Delete a note from a user")
						.addUserOption((option) =>
							option
								.setName("user")
								.setDescription("User to delete a note from")
								.setRequired(true),
						),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("view")
						.setDescription("View a user's notes")
						.addUserOption((option) =>
							option
								.setName("user")
								.setDescription("User to view notes of")
								.setRequired(true),
						),
				),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel || !interaction.channel.isTextBased()) return;

		switch (interaction.options.getSubcommand()) {
			case "add": {
				const user = interaction.options.getUser("user", true);
				const note = interaction.options.getString("note", true);

				await interaction.deferReply({
					flags: MessageFlags.Ephemeral,
				});

				const guildPreferences = await GuildPreferencesCache.get(
					interaction.guildId,
				);

				if (!guildPreferences) {
					interaction.editReply({
						content:
							"Please setup the bot using the command `/setup` first.",
					});
					return;
				}

				await ModNote.create({
					guildId: interaction.guild.id,
					actionAgainst: user.id,
					actionBy: interaction.user.id,
					note,
					when: new Date(),
				});

				if (guildPreferences.modlogChannelId) {
					const modEmbed = new EmbedBuilder()
						.setTitle(`Note added`)
						.setColor(Colors.Blurple)
						.addFields([
							{
								name: "User",
								value: `${user.tag} (${user.id})`,
								inline: false,
							},
							{
								name: "Moderator",
								value: `${interaction.user.tag} (${interaction.user.id})`,
								inline: false,
							},
							{
								name: "Note",
								value: note,
								inline: false,
							},
						])
						.setTimestamp();

					logToChannel(
						interaction.guild,
						guildPreferences.modlogChannelId,
						{
							embeds: [modEmbed],
						},
					);
				}

				interaction.editReply({
					content: `\✅ Note added to ${user.username}`,
				});

				return;
			}

			case "delete": {
				const user = interaction.options.getUser("user", true);

				const guildPreferences = await GuildPreferencesCache.get(
					interaction.guildId,
				);

				if (!guildPreferences) {
					interaction.editReply({
						content:
							"Please setup the bot using the command `/setup` first.",
					});
					return;
				}

				const notes = await ModNote.find({
					guildId: interaction.guildId,
					actionAgainst: user.id,
				});

				if (notes.length < 1) {
					await interaction.reply(
						`${user.tag} does not have any notes.`,
					);

					return;
				}

				const customId = uuidv4();

				const noteSelect = new Select(
					"note",
					"Select a note to remove",
					notes.map(({ id, note }) => ({
						label: ((x) =>
							x.length > 100 ? `${x.slice(0, 97)}...` : x)(note),
						value: id,
					})),
					1,
					customId,
				);

				const selectInteraction = await interaction.reply({
					content: "Select a note to remove",
					components: [
						new ActionRowBuilder<Select>().addComponents(
							noteSelect,
						),
						new Buttons(
							customId,
						) as ActionRowBuilder<ButtonBuilder>,
					],
					fetchReply: true,
					flags: MessageFlags.Ephemeral,
				});

				const response = await noteSelect.waitForResponse(
					customId,
					selectInteraction,
					interaction,
					true,
				);

				if (!response || response === "Timed out") return;

				const note = await ModNote.findById(response[0]);

				if (!note) {
					await interaction.reply({
						content: "Note not found",
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				try {
					await note.deleteOne();
				} catch (error) {
					interaction.followUp({
						content: `Failed to remove note ${error instanceof Error ? `(${error.message})` : ""}`,
					});

					client.log(
						error,
						`${this.data.name} Command`,
						`
							* * Channel:** <#${interaction.channel?.id} >

							**User:** <@${interaction.user.id}>
							**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
					);
				}

				await interaction.editReply({
					content: `Note removed for ${user.username}`,
					components: [],
				});

				if (guildPreferences.modlogChannelId) {
					const modEmbed = new EmbedBuilder()
						.setTitle(`Note removed`)
						.setColor(Colors.Blurple)
						.addFields([
							{
								name: "User",
								value: `${user.tag} (${user.id})`,
								inline: false,
							},
							{
								name: "Moderator",
								value: `${interaction.user.tag} (${interaction.user.id})`,
								inline: false,
							},
							{
								name: "Note",
								value: note.note,
								inline: false,
							},
						])
						.setTimestamp();

					logToChannel(
						interaction.guild,
						guildPreferences.modlogChannelId,
						{
							embeds: [modEmbed],
						},
					);
				}

				return;
			}

			case "view": {
				const user = interaction.options.getUser("user", true);

				const notes = await ModNote.find({
					guildId: interaction.guildId,
					actionAgainst: user.id,
				});

				if (notes.length < 1) {
					await interaction.reply(
						`${user.tag} does not have any notes.`,
					);
					return;
				}

				const notesList = [];

				for (const { note, when, actionBy } of notes) {
					const moderator =
						interaction.guild.members.cache.get(actionBy)?.user
							.tag ?? actionBy;

					const date = when.toLocaleDateString("en-GB");
					const time = when.toLocaleTimeString("en-GB", {
						hour12: true,
						hour: "2-digit",
						minute: "2-digit",
					});
					notesList.push(
						`[${date} at ${time}] ${note} by ${moderator}`,
					);
				}

				let description = `\`\`\`\n${notesList.join("\n")}\n\`\`\``;

				const embed = new EmbedBuilder()
					.setTitle(`Notes for ${user.tag}`)
					.setAuthor({
						name: `${user.username} (ID: ${user.id})`,
						iconURL: user.displayAvatarURL(),
					})
					.setColor(Colors.DarkGreen)
					.setDescription(description);

				await interaction.reply({
					embeds: [embed],
				});

				return;
			}
		}
	}
}
