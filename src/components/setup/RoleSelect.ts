import { GuildPreferences } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import { Logger } from "@discordforge/logger";
import { ComponentType, type Message, RoleSelectMenuBuilder } from "discord.js";

class RoleSelect extends RoleSelectMenuBuilder {
	name: string;
	isFirstComponent = true;
	maxValues: number;
	customId: string;
	constructor(
		name: string,
		placeholder: string,
		maxValues: number,
		customId: string,
	) {
		super();
		this.name = name;
		this.maxValues = maxValues;
		this.customId = customId;
		// every 5th component is the first component aka 0, 5, 10 and so on
		this.isFirstComponent =
			Number.parseInt(customId.split("_")[1]) % 5 === 0;
		this.setPlaceholder(placeholder)
			.setMaxValues(maxValues)
			.setCustomId(customId);
	}

	async createCollector(
		customId: string,
		interaction: Message<true>,
		maxValues: number,
	): Promise<void> {
		const selectCollector = interaction.createMessageComponentCollector({
			filter: (i) => i.customId === customId,
			time: 600_000, // 10 minutes
			componentType: ComponentType.RoleSelect,
		});

		selectCollector.on("collect", async (i) => {
			await i.deferUpdate();

			const result = await GuildPreferences.updateOne(
				{
					guildId: interaction.guildId,
				},
				{
					[this.name]: maxValues === 1 ? i.values[0] : i.values,
				},
				{
					upsert: true,
				},
			);

			if (!result?.acknowledged) {
				await i.reply({
					content:
						"Failed to update the database. This exception has been logged.",
					ephemeral: true,
				});
				Logger.error(`Failed to update the database for ${this.name}`);
				return;
			}

			await i.followUp({
				content: `Sucessfully updated ${this.name} to ${i.values.map((x) => `<@&${x}>`).join(", ")}.`,
				ephemeral: true,
			});

			await GuildPreferencesCache.remove(interaction.guildId);
		});

		/*selectCollector.on("end", async () => {
			if (this.isFirstComponent) {
				await editMessage({
					components: [],
					content: "Timed out"
				});
			}
		});*/
	}
}

export default RoleSelect;
