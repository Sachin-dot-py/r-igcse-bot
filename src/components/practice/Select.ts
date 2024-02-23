import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';

class Select extends StringSelectMenuBuilder {
    name: string;
    constructor(name: string, placeholder: string, options: StringSelectMenuOptionBuilder[], max_values: number, customId: string) {
        super();
        this.name = name;
        this.setPlaceholder(placeholder)
            .addOptions(...options)
            .setMaxValues(max_values)
            .setCustomId(customId);
    }
}

export default Select;