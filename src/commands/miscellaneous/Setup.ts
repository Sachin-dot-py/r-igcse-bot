import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import {
	ActionRowBuilder,
	ButtonBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	type APISelectMenuOption
} from "discord.js";
import { preferences } from "@/data";
import StringSelect from "@/components/setup/StringSelect";
import ChannelSelect from "@/components/setup/ChannelSelect";
import RoleSelect from "@/components/setup/RoleSelect";
import { GuildPreferencesCache } from "@/redis";
import { v4 as uuidv4 } from "uuid";
import SetupButtons from "@/components/setup/SetupButtons";

const typeToComponent: {
	[key: string]:
		| typeof StringSelect
		| typeof ChannelSelect
		| typeof RoleSelect;
} = {
	boolean: StringSelect,
	channel: ChannelSelect,
	role: RoleSelect
};

export default class SetupCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("setup")
				.setDescription("Setup the bot for your server (for admins)")
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const selectComponents: (StringSelect | ChannelSelect | RoleSelect)[] =
			[];

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId
		);

		let customId = uuidv4();
		let pageCounter = 0;

		const setupButtons = new SetupButtons(customId);

		const buttonMessage = await interaction.reply({
			content:
				"Please use the dropdowns and the buttons below to setup the bot.",
			ephemeral: true,
			components: [setupButtons as ActionRowBuilder<ButtonBuilder>],
			fetchReply: true
		});

		setupButtons.createCollector(customId, buttonMessage);

		preferences.forEach(async (preference, index) => {
			const Component = typeToComponent[preference.type];
			const component = new Component(
				preference.key,
				preference.name,
				preference.maxValues ?? 1,
				`${customId}_${index}`
			);

			switch (preference.type) {
				case "boolean":
					if (component instanceof StringSelect) {
						component.addOptions(
							{
								label: "Yes",
								value: "true",
								default:
									guildPreferences?.[preference.key] === true
							},
							{
								label: "No",
								value: "false",
								default:
									guildPreferences?.[preference.key] === false
							}
						);
					}
					break;

				case "channel":
					if (
						guildPreferences?.[preference.key] &&
						component instanceof ChannelSelect
					) {
						typeof guildPreferences[preference.key] === "string"
							? component.setDefaultChannels(
									// @ts-expect-error - guildPreferences[preference.key] will not be undefined
									guildPreferences[preference.key]
								)
							: component.setDefaultChannels(
									// @ts-expect-error - guildPreferences[preference.key] will either be a string or an array of strings
									...guildPreferences[preference.key]
								);
					}
					break;

				case "role":
					if (
						guildPreferences?.[preference.key] &&
						component instanceof RoleSelect
					) {
						typeof guildPreferences[preference.key] === "string"
							? component.setDefaultRoles(
									// @ts-expect-error - guildPreferences[preference.key] will not be undefined
									guildPreferences[preference.key]
								)
							: component.setDefaultRoles(
									...guildPreferences[preference.key]
								);
					}
					break;

				default:
					break;
			}
			selectComponents.push(component);
		});

		for (let i = 0; i < selectComponents.length; i += 5) {
			pageCounter++;
			const toSendComponents = selectComponents.slice(i, i + 5);
			const rows = toSendComponents.map((c) =>
				new ActionRowBuilder().addComponents(c)
			);
			const selectInteraction = await interaction.followUp({
				content: `Page ${pageCounter}`,
				components: rows as ActionRowBuilder<any>[],
				ephemeral: true,
				fetchReply: true
			});

			toSendComponents.forEach((c) => {
				c.createCollector(
					c.customId,
					selectInteraction,
					c.maxValues,
					selectInteraction
				);
			});
		}
	}
}
