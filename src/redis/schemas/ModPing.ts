import {
	type Entity,
	type RedisConnection,
	Repository,
	Schema,
} from "redis-om";

export interface IModPing extends Entity {
	guildId: string;
	userId: string;
	when: Date;
}

export const ModPing = new Schema("ModPing", {
	guildId: { type: "string" },
	userId: { type: "string" },
	when: { type: "date" },
});

export class ModPingRepository extends Repository {
	constructor(redis: RedisConnection) {
		super(ModPing, redis);
	}

	async get(id: string): Promise<IModPing | null> {
		const user = (await this.fetch(id)) as IModPing;
		if (!user || !user.userId) {
			return null;
		}
		return user;
	}

	async set(id: string, data: IModPing): Promise<void> {
		await this.save(id, data);
	}

	async getAll(): Promise<IModPing[]> {
		return (await this.search().return.all()) as IModPing[];
	}
}
