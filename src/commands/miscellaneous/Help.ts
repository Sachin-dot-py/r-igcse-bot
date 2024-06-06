import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { PaginationBuilder } from "@discordforge/pagination";
import { Colors, PermissionsBitField, SlashCommandBuilder } from "discord.js";

export default class HelpCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("help")
				.setDescription("A list of all the commands available to you.")
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const commands = client.commands.filter((command) => {
			if (!("description" in command.data)) return false;
			if (
				command.mainGuildOnly &&
				interaction.guildId !== process.env.MAIN_GUILD_ID
			)
				return false;
			if (!command.data.default_member_permissions) return true;
			if (interaction.member?.permissions instanceof PermissionsBitField)
				return interaction.member.permissions.has(
					BigInt(command.data.default_member_permissions),
				);
		});

		new PaginationBuilder(
			commands.map(({ data }) => ({
				name: data.name,
				description:
					"description" in data
						? data.description
						: "Couldn't get description. Report using `/feedback`",
			})),
			async ({ name, description }) => ({
				name: `/${name}`,
				value: description,
			}),
		)
			.setTitle("Help Menu")
			.setColor(Colors.Blurple)
			.build((page) => interaction.reply(page), [interaction.user.id]);
	}
}
