import type { DiscordClient } from "@/registry/DiscordClient";
import BaseMenu from "@/registry/Structure/BaseMenu";
import {
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	ContextMenuCommandBuilder,
	ContextMenuCommandInteraction,
	EmbedBuilder,
	PermissionFlagsBits,
} from "discord.js";

const tempHelperData: {
	[key: string]: string;
} = {
	"576463745073807372": "696688133844238367",
	"576463729802346516": "696415409720786994",
	"576463717844254731": "696415478331211806",
	"576461721900679177": "697031993820446720",
	"576463988506886166": "697032184451563530",
	"579288532942848000": "854000279933812737",
	"579292149678342177": "697032265624060005",
	"576464244455899136": "863699698234032168",
	"576463493646123025": "697031812102225961",
	"576463562084581378": "697031148685230191",
	"576463593562701845": "697090437520949288",
	"579386214218465281": "888382475645120575",
	"576463609325158441": "776986644757610517",
	"576463682054389791": "697031853369983006",
	"576461701332074517": "697030773814853633",
	"576463472544710679": "697030911023120455",
	"871702123505655849": "871702647223255050",
	"576463638983082005": "697031447021748234",
	"868056343871901696": "697031555457220673",
	"576463799582851093": "697031087985262612",
	"576463769526599681": "697030991205892156",
	"576463668808646697": "697407528685797417",
	"576464116336689163": "697031043089170463",
	"576463907485646858": "697031773435068466",
	"871589653315190845": "848529485351223325",
	"576463811327033380": "697031605100740698",
	"576463820575211560": "697031649233338408",
	"576463893858222110": "697031735086546954",
	"576463832168398852": "697031692115771513",
	"871590306338971678": "871588409032990770",
	"886883608504197130": "886884656845312020",
	"576464270041022467": "863691773628907560",
	"697072778553065542": "578170681670369290",
	"929349933432193085": "929422215940825088",
	"881366448423993344": "988167800164069386",
	"853585485338247189": "968534459890675732",
	"853585554797101066": "968512358257410048",
	"868324934143856660": "968597904405196881",
	"853585747587891201": "972583036602417212",
	"853585657921667092": "988168508925939782",
	"868325088234205195": "968595069760323644",
	"883184595019890738": "995173576107892767",
	"853587786099982396": "968513578875379724",
	"883184638267383848": "988171672966291527",
	"883184662292361276": "994981893596532837",
	"947859228649992213": "949941010430033950",
	"578977030582960132": "1082457204298350622",
	"1097739264139206717": "1052852529970561104",
	"1032065926595629079": "1032067091131535451", // Test channel/role
};

export default class HelperMenu extends BaseMenu {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("helper")
				.setType(ApplicationCommandType.Message)
				.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
		);
	}

	async execute(
		client: DiscordClient,
		interaction: ContextMenuCommandInteraction,
	) {
		if (
			!interaction.guild ||
			!interaction.channel ||
			!interaction.isMessageContextMenuCommand()
		)
			return;

		if (interaction.guild.id !== "576460042774118420") {
			await interaction.reply(
				"Functionality not yet implemented for your server",
			);
			return;
		}

		// const guildPreferences = await GuildPreferencesCache.get(
		// 	interaction.guild.id,
		// );

		// if (!guildPreferences) return;

		const roleId = tempHelperData[interaction.channel.id];
		const role = interaction.guild.roles.cache.get(roleId);

		if (!role) {
			await interaction.reply({
				content: "No helper for this channel",
				ephemeral: true,
			});
			return;
		}

		// TODO: Server Booster perk

		const embed = new EmbedBuilder()
			.setDescription(
				`The helper role for this channel, \`@${role.name}\`, will automatically be pinged (<t:${Date.now() + 890}:R>).\nIf your query has been resolved by then, please click on the \`Cancel Ping\` button.`,
			)
			.setAuthor({
				name: interaction.user.displayName,
				iconURL: interaction.user.displayAvatarURL(),
			});

		const cancelButton = new ButtonBuilder()
			.setCustomId("cancel_ping")
			.setLabel("Cancel Ping")
			.setStyle(ButtonStyle.Danger);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			cancelButton,
		);

		await interaction.channel.send({
			embeds: [embed],
			components: [row],
		});

		const collector = interaction.channel.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 890,
			filter: (i) =>
				i.user.id === interaction.user.id ||
				i.memberPermissions.has(PermissionFlagsBits.ModerateMembers),
		});

		collector.on("collect", async (i) => {
			if (!(i.customId === "cancel_ping")) return;
			interaction.editReply({
				content: `Ping cancelled by ${i.user.displayName}`,
			});
		});

		collector.on("end", async () => {
			if (!interaction.channel) return;

			const embed = new EmbedBuilder()
				.setDescription(
					`[Jump to the message.](${interaction.targetMessage.url})`,
				)
				.setAuthor({
					name: interaction.user.displayName,
					iconURL: interaction.user.displayAvatarURL(),
				});

			await interaction.channel.send({
				content: `<@${role.id}>`,
				embeds: [embed],
			});
			await interaction.deleteReply();
		});
	}
}
