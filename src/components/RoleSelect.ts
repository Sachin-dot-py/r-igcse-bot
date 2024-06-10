import type { DiscordChatInputCommandInteraction } from "@/registry/Structure/BaseCommand";
import {
	ComponentType,
	Message,
	type ModalSubmitInteraction,
	RoleSelectMenuBuilder,
} from "discord.js";

class RoleSelect extends RoleSelectMenuBuilder {
	name: string;
	isFirstComponent = true;

	constructor(
		name: string,
		placeholder: string,
		maxValues: number,
		customId: string,
		defaultRoles: string[],
	) {
		super();
		this.name = name;
		this.isFirstComponent = customId.split("_")[1] === "0";
		this.setPlaceholder(placeholder)
			.setMaxValues(maxValues)
			.setCustomId(customId)
			.setDefaultRoles(...defaultRoles);
	}

	async waitForResponse(
		customId: string,
		interaction: Message,
		editableMessage:
			| Message
			| ModalSubmitInteraction
			| DiscordChatInputCommandInteraction,
		required: boolean,
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
					componentType: ComponentType.RoleSelect,
				},
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
				componentType: ComponentType.Button,
			});

			if (buttonResponse.customId === `confirm_${buttonCustomId}`) {
				if (value.length === 0) {
					if (
						selectCollector.total === 0 &&
						this.data.default_values?.length
					) {
						return (
							this.data.default_values?.map((role) => role.id) ||
							false
						);
					}
					switch (required) {
						case true:
							if (this.isFirstComponent) {
								await editMessage({
									content:
										"You must select at least one option",
									components: [],
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
						components: [],
					});
				}
				return false;
			}
		} catch (error) {
			if (this.isFirstComponent) {
				await editMessage({
					content: "Timed out",
					components: [],
				});
			}
			return "Timed out";
		}
	}
}

export default RoleSelect;
