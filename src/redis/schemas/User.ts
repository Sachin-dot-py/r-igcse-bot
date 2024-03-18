import {
	Schema,
	type Entity,
	Repository,
	type RedisConnection
} from "redis-om";

export interface IUser extends Entity {
	userId: string;
	playing: boolean;
	subject?: string;
	sessionId?: string;
}

export const User = new Schema("User", {
	userId: { type: "string" },
	playing: { type: "boolean" },
	subject: { type: "string" },
	sessionId: { type: "string" }
});

export class UserRepository extends Repository {
	constructor(redis: RedisConnection) {
		super(User, redis);
	}

	async get(userId: string): Promise<IUser | null> {
		const user = (await this.fetch(userId)) as IUser;
		if (!user.userId) {
			return null;
		}
		return user;
	}

	async set(userId: string, data: IUser): Promise<void> {
		await this.save(userId, data);
	}

	async getAll(): Promise<IUser[]> {
		return (await this.search().return.all()) as IUser[];
	}
}
