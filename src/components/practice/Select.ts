import {
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ComponentType,
	Message,
} from "discord.js";

class Select extends StringSelectMenuBuilder {
	name: string;
	constructor(
		name: string,
		placeholder: string,
		options: StringSelectMenuOptionBuilder[],
		max_values: number,
		customId: string,
	) {
		super();
		this.name = name;
		this.setPlaceholder(placeholder)
			.addOptions(...options)
			.setMaxValues(max_values)
			.setCustomId(customId);
	}

	async waitForResponse(customId: string, interaction: Message): Promise<string[] | false> {
		try {
			let value: string[] = [];
			const selectCollector = interaction.createMessageComponentCollector({
				filter: (i) => i.customId === customId,
				time: 300_000,
				componentType: ComponentType.StringSelect
			});

			console.log(selectCollector.guildId)

			selectCollector.on("collect", async (i) => {
				i.deferUpdate();
				console.log(i.values)
				value = i.values;
			});

			const buttonCustomId = customId.split("_")[0];
			const buttonResponse = await interaction.awaitMessageComponent({
				filter: async (i) => {
					await i.deferUpdate()
					return i.customId === `confirm_${buttonCustomId}` || i.customId === `cancel_${buttonCustomId}`
				},
				time: 300_000,
				componentType: ComponentType.Button
			});

			if (buttonResponse.customId === `confirm_${buttonCustomId}`) {
				if (value.length === 0) {
					interaction.edit({
						content: "You must select at least one option",
						components: []
					})
					return false;
				}
				console.log(value)
				return value;
			} else {
				interaction.edit({
					content: "Cancelled",
					components: []
				})
				return false;
			}

		} catch (error) {
			interaction.edit({
				content: "Timed out",
				components: []
			})
			return false;
		}
	}
}

export default Select;
