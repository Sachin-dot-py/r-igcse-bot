import type { DiscordClient } from "../DiscordClient";

export default abstract class BaseEvent {
	constructor(private _name: string) {}

	get name() {
		return this._name;
	}

	abstract execute(
		client: DiscordClient<true>,
		...args: unknown[]
	): Promise<void>;
}
