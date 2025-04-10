import {
	type APISelectMenuOption,
	ComponentType,
	type InteractionCollector,
	type Message,
	StringSelectMenuBuilder,
	type StringSelectMenuInteraction,
	type StringSelectMenuOptionBuilder,
} from "discord.js";

class Select extends StringSelectMenuBuilder {
	name: string;
	isFirstComponent = true;
	constructor(
		name: string,
		placeholder: string,
		options: StringSelectMenuOptionBuilder[] | APISelectMenuOption[],
		maxValues: number,
		customId: string,
	) {
		super();
		this.name = name;
		this.isFirstComponent = customId.split("_")[1] === "0";
		this.setPlaceholder(placeholder)
			.addOptions(...options)
			.setMaxValues(maxValues)
			.setCustomId(customId);
	}

	async waitForResponse(
		customId: string,
		message: Message,
	): Promise<
		InteractionCollector<StringSelectMenuInteraction> | false | "Timed out"
	> {
		try {
			return message.createMessageComponentCollector({
				filter: (i: StringSelectMenuInteraction) =>
					i.customId === customId,
				time: 300_000,
				componentType: ComponentType.StringSelect,
			});
		} catch (error) {
			if (this.isFirstComponent) {
				await message.edit({
					content: "Timed out",
					components: [],
				});
			}
			return "Timed out";
		}
	}
}

export default Select;
