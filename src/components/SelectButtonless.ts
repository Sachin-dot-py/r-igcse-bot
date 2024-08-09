import type { DiscordChatInputCommandInteraction } from "@/registry/Structure/BaseCommand";
import {
    type APISelectMenuOption,
    ComponentType, InteractionCollector,
    Message,
    type ModalSubmitInteraction,
    StringSelectMenuBuilder,
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
        interaction,
    ): Promise<InteractionCollector<any> | false | "Timed out"> {

        try {
            return interaction.createMessageComponentCollector(
                {
                    filter: (i) => i.customId === customId,
                    time: 300_000,
                    componentType: ComponentType.StringSelect,
                },
            );
        } catch (error) {
            if (this.isFirstComponent) {
                await interaction.followUp({
                    content: "Timed out",
                    components: [],
                });
            }
            return "Timed out";
        }
    }
}

export default Select;
