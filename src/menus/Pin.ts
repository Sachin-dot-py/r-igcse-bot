import type { DiscordClient } from "@/registry/DiscordClient";
import BaseMenu, {
	type DiscordMessageContextMenuCommandInteraction
} from "@/registry/Structure/BaseMenu";
import {
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	PermissionFlagsBits
} from "discord.js";

export default class PinMenu extends BaseMenu {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("pin")
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false)
				.setType(ApplicationCommandType.Message)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordMessageContextMenuCommandInteraction<"cached">
	) {
		try {
			await interaction.targetMessage.pin();

			await interaction.reply({
				content: "Successfully pinned message.",
				ephemeral: true
			});
		} catch (error) {
			await interaction.reply({
				content: "Couldn't pin message.",
				ephemeral: true
			});

			client.log(error, `${this.data.name} Menu`, [
				{ name: "User ID", value: interaction.user.id },
				{ name: "Message ID", value: interaction.targetId }
			]);
		}
	}
}
