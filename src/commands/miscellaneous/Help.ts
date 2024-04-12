import {
	Colors,
	EmbedBuilder,
	PermissionsBitField,
	SlashCommandBuilder
} from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";
import Pagination from "@/components/Pagination";

export default class HelpCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("help")
				.setDescription("A list of all the commands available to you.")
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const commands = client.commands.filter((command) => {
			if (!("description" in command.data)) return false;
			if (
				command.mainGuildOnly &&
				interaction.guildId !== process.env.MAIN_GUILD_ID
			)
				return false;
			if (!command.data.default_member_permissions) return true;
			if (
				interaction.member?.permissions instanceof PermissionsBitField
			) {
				return interaction.member.permissions.has(
					BigInt(command.data.default_member_permissions)
				);
			}
		});

		const chunks = Array.from(
			{ length: Math.ceil(commands.size / 9) },
			(_, i) => Array.from(commands.values()).slice(i * 9, i * 9 + 9)
		);

		const paginator = new Pagination(chunks, async (chunk) => {
			const embed = new EmbedBuilder()
				.setTitle("Help Menu")
				.setColor(Colors.Blurple)
				.setDescription(
					`Page ${chunks.indexOf(chunk) + 1} of ${chunks.length}`
				);

			for (const command of chunk) {
				if ("description" in command.data)
					embed.addFields({
						name: `/${command.data.name}`,
						value: command.data.description
					});
			}

			return {
				embeds: [embed]
			};
		});

		await paginator.start({
			interaction,
			ephemeral: true,
			time: 900_000 // 15 minutes
		});
	}
}
