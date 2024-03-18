import type { DiscordChatInputCommandInteraction } from "@/registry/Structure/BaseCommand";
import {
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ComponentType,
	Message,
	ModalSubmitInteraction
} from "discord.js";

class Select extends StringSelectMenuBuilder {
	name: string;
	isFirstComponent: boolean = true;
	constructor(
		name: string,
		placeholder: string,
		options: StringSelectMenuOptionBuilder[],
		max_values: number,
		customId: string
	) {
		super();
		this.name = name;
		this.isFirstComponent = customId.split("_")[1] === "0";
		this.setPlaceholder(placeholder)
			.addOptions(...options)
			.setMaxValues(max_values)
			.setCustomId(customId);
	}

	async waitForResponse(
		customId: string,
		interaction: Message,
		editableMessage:
			| Message
			| ModalSubmitInteraction
			| DiscordChatInputCommandInteraction,
		required: boolean
	): Promise<string[] | false | "Timed out"> {
		const editMessage =
			editableMessage instanceof Message
				? editableMessage.edit
				: editableMessage.editReply;

		try {
			let value: string[] = [];
			const selectCollector = interaction.createMessageComponentCollector(
				{
					filter: (i) => i.customId === customId,
					time: 300_000,
					componentType: ComponentType.StringSelect
				}
			);

			selectCollector.on("collect", async (i) => {
				await i.deferUpdate();
				value = i.values;
			});

			const buttonCustomId = customId.split("_")[0];
			const buttonResponse = await interaction.awaitMessageComponent({
				filter: async (i) => {
					this.isFirstComponent && i.deferUpdate();
					return (
						i.customId === `confirm_${buttonCustomId}` ||
						i.customId === `cancel_${buttonCustomId}`
					);
				},
				time: 300_000,
				componentType: ComponentType.Button
			});

			if (buttonResponse.customId === `confirm_${buttonCustomId}`) {
				if (value.length === 0) {
					switch (required) {
						case true:
							if (this.isFirstComponent) {
								await editMessage({
									content:
										"You must select at least one option",
									components: []
								});
							}
							return false;

						case false:
							return false;
					}
				}
				return value;
			} else {
				if (this.isFirstComponent) {
					await editMessage({
						content: "Cancelled",
						components: []
					});
				}
				return false;
			}
		} catch (error) {
			if (this.isFirstComponent) {
				await editMessage({
					content: "Timed out",
					components: []
				});
			}
			return "Timed out";
		}
	}
}

export default Select;
