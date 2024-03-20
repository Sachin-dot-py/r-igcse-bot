import { GuildPreferences } from "@/mongo";
import type { DiscordChatInputCommandInteraction } from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import {
	StringSelectMenuBuilder,
	ComponentType,
	Message,
	ModalSubmitInteraction
} from "discord.js";

class StringSelect extends StringSelectMenuBuilder {
	name: string;
	isFirstComponent: boolean = true;
	maxValues: number;
	customId: string;
	constructor(
		name: string,
		placeholder: string,
		maxValues: number,
		customId: string
	) {
		super();
		this.name = name;
		this.maxValues = maxValues;
		this.customId = customId;
		// every 5th component is the first component aka 0, 5, 10 and so on
		this.isFirstComponent = parseInt(customId.split("_")[1]) % 5 === 0;
		this.setPlaceholder(placeholder)
			.setMaxValues(maxValues)
			.setCustomId(customId);
	}

	async createCollector(
		customId: string,
		interaction: Message<true>,
		maxValues: number,
		editableMessage:
			| Message<true>
			| ModalSubmitInteraction
			| DiscordChatInputCommandInteraction<"cached">
	): Promise<void> {
		const editMessage =
			editableMessage instanceof Message
				? editableMessage.edit
				: editableMessage.editReply;

		const selectCollector = interaction.createMessageComponentCollector({
			filter: (i) => i.customId === customId,
			time: 600_000, // 10 minutes
			componentType: ComponentType.StringSelect
		});

		selectCollector.on("collect", async (i) => {
			await i.deferUpdate();

			const result = await GuildPreferences.updateOne(
				{
					guildId: interaction.guildId
				},
				{
					[this.name]: maxValues === 1 ? i.values[0] : i.values
				},
				{
					upsert: true
				}
			);

			if (!result?.acknowledged) {
				await i.reply({
					content:
						"Failed to update the database. This exception has been logged.",
					ephemeral: true
				});
				Logger.error(`Failed to update the database for ${this.name}`);
				return;
			}

			await i.followUp({
				content: `Sucessfully updated ${this.name} to ${i.values.map((x) => `\`${x}\``).join(", ")}.`,
				ephemeral: true
			});
		});

		selectCollector.on("end", async (collected, reason) => {
			if (this.isFirstComponent) {
				await editMessage({
					components: [],
					content: "Timed out"
				});
			}
		});
	}
}

export default StringSelect;
