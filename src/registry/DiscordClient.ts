import {
	Client,
	Collection,
	EmbedBuilder,
	type APIEmbedField,
	type ClientOptions,
	type RESTPostAPIApplicationCommandsJSONBody,
	type RESTPostAPIContextMenuApplicationCommandsJSONBody,
	type RestOrArray
} from "discord.js";
import type BaseCommand from "./Structure/BaseCommand";
import type BaseMenu from "./Structure/BaseMenu";
import Logger from "@/utils/Logger";

export class DiscordClient<
	Ready extends boolean = boolean
> extends Client<Ready> {
	private _commands = new Collection<string, BaseCommand>();
	private _menus = new Collection<string, BaseMenu>();

	private _stickyChannelIds: string[] = [];
	private _stickyCounter: Record<string, number> = {};

	constructor(options: ClientOptions) {
		super(options);
	}

	get stickyChannelIds() {
		return this._stickyChannelIds;
	}

	set stickyChannelIds(channelIds: string[]) {
		this._stickyChannelIds = channelIds;
	}

	get stickyCounter() {
		return this._stickyCounter;
	}

	set stickyCounter(counts: Record<string, number>) {
		this._stickyCounter = counts;
	}

	get commands() {
		return this._commands;
	}

	get menus() {
		return this._menus;
	}

	get interactionData() {
		return this._menus
			.map<
				| RESTPostAPIApplicationCommandsJSONBody
				| RESTPostAPIContextMenuApplicationCommandsJSONBody
			>((menu) => menu.data.toJSON())
			.concat(this._commands.map((menu) => menu.data.toJSON()));
	}

	public async log(
		message: unknown,
		source: string,
		fields: APIEmbedField[]
	) {
		const mainGuild = this.guilds.cache.get(process.env.MAIN_GUILD_ID);
		if (!mainGuild) {
			Logger.error("Main Guild not found. Unable to log.");

			return;
		}

		const embed = new EmbedBuilder()
			.setTitle(`An Exception Occured - ${source}`)
			.setDescription(
				`Error: \`\`\`${message instanceof Error ? message.stack : message}\`\`\``
			)
			.addFields(fields);

		const channel = await mainGuild.channels.cache.get(
			process.env.ERROR_LOGS_CHANNEL_ID
		);
		if (!channel || !channel.isTextBased()) {
			Logger.error(
				"Bot Log channel not found or is not a text-based channel."
			);

			return;
		}

		await channel.send({ embeds: [embed] });
	}
}
