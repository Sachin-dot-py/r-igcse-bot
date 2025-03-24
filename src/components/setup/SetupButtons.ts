import { GuildPreferencesCache } from "@/redis";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	type Message,
} from "discord.js";
import SetBanAppealModal from "./SetBanAppealModal";
import SetWelcomeModal from "./SetWelcomeModal";

class SetupButtons extends ActionRowBuilder {
	constructor(customId: string) {
		super();

		const setWelcomeButton = new ButtonBuilder()
			.setCustomId(`setWelcome_${customId}`)
			.setLabel("Set Welcome Message")
			.setStyle(ButtonStyle.Primary);

		const setBanAppealLinkButton = new ButtonBuilder()
			.setCustomId(`setBanAppealLink_${customId}`)
			.setLabel("Set Ban Appeal Link")
			.setStyle(ButtonStyle.Primary);

		this.addComponents(setWelcomeButton, setBanAppealLinkButton);
	}

	async createCollector(
		customId: string,
		interaction: Message<true>,
	): Promise<void> {
		const buttonCollector = interaction.createMessageComponentCollector({
			filter: (i) =>
				i.customId === `setWelcome_${customId}` ||
				i.customId === `setBanAppealLink_${customId}`,
			time: 600_000, // 10 minutes
			componentType: ComponentType.Button,
		});

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);
		buttonCollector.on("collect", async (i) => {
			switch (i.customId) {
				case `setWelcome_${customId}`: {
					const setWelcomeModal = new SetWelcomeModal(
						`welcomeModal_${customId}`,
						guildPreferences,
					);
					await i.showModal(setWelcomeModal);
					await setWelcomeModal.waitForResponse(
						`welcomeModal_${customId}`,
						i,
					);
					break;
				}
				case `setBanAppealLink_${customId}`: {
					const setBanAppealModal = new SetBanAppealModal(
						`banAppealModal_${customId}`,
						guildPreferences,
					);
					await i.showModal(setBanAppealModal);
					await setBanAppealModal.waitForResponse(
						`banAppealModal_${customId}`,
						i,
					);
					break;
				}
			}
		});
	}
}

export default SetupButtons;
