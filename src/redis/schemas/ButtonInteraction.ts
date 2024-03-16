import {
	Schema,
	type Entity,
	Repository,
	type RedisConnection,
} from "redis-om";

export interface IButtonInteraction extends Entity {
	customId: string;
	messageId: string;
}

export const ButtonInteraction = new Schema("ButtonInteraction", {
	customId: { type: "string" },
	messageId: { type: "string" },
});

export class ButtonInteractionRepository extends Repository {
	constructor(redis: RedisConnection) {
		super(ButtonInteraction, redis);
	}

	async get(customId: string): Promise<IButtonInteraction | null> {
		return (await this.fetch(customId)) as IButtonInteraction;
	}

	async set(customId: string, data: IButtonInteraction): Promise<void> {
		await this.save(customId, data);
	}

	async getAll(): Promise<IButtonInteraction[]> {
		return (await this.search().return.all()) as IButtonInteraction[];
	}
}
