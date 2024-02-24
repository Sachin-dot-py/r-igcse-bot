import type { RedisClientType } from "redis";
import { Schema, type Entity, Repository } from "redis-om";

export interface IUser extends Entity {
	userId: string;
	playing: boolean;
	subject?: string;
	sessionId?: string;
}

export const User = new Schema(
	"User",
	{
		userId: { type: "string" },
		playing: { type: "boolean" },
		subject: { type: "string" },
		sessionId: { type: "string" },
	},
	{
		dataStructure: "JSON",
	},
);

export class UserRepo extends Repository {
	constructor(redis: RedisClientType) {
		super(User, redis);
		this.createIndex();
	}

	async get(userId: string): Promise<IUser | null> {
		return (await this.fetch(userId)) as IUser;
	}

	async set(userId: string, data: IUser): Promise<void> {
		await this.save(userId, data);
	}

	async delete(userId: string): Promise<void> {
		await this.remove(userId);
	}

	async getAll(): Promise<IUser[]> {
		return (await this.search().return.all()) as IUser[];
	}
}
