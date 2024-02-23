import type { RedisClientType } from "redis";
import { Schema, type Entity, Repository } from "redis-om";

export interface ISession extends Entity {
	sessionId: string;
	channelId: string;
	threadId: string;
	subject: string;
	topics: string[];
	limit: number;
	minimumYear: number;
	users: string[];
	owner: string;
	private: boolean;
	paused: boolean;
	currentlySolving: string;
	expireTime: Date;
}

export const Session = new Schema(
	"Session",
	{
		sessionId: { type: "string" },
		channelId: { type: "string" },
		threadId: { type: "string" },
		subject: { type: "string" },
		topics: { type: "string[]" },
		limit: { type: "number" },
		minimumYear: { type: "number" },
		users: { type: "string[]" },
		owner: { type: "string" },
		private: { type: "boolean" },
		paused: { type: "boolean" },
		currentlySolving: { type: "string" },
		expireTime: { type: "date" },
	},
	{
		dataStructure: "JSON",
	},
);

export class SessionRepo extends Repository {
	constructor(redis: RedisClientType) {
		super(Session, redis);
		this.createIndex();
	}

	async get(sessionId: string): Promise<ISession | null> {
		return (await this.fetch(sessionId)) as ISession;
	}

	async set(sessionId: string, data: ISession): Promise<void> {
		await this.save(sessionId, data);
	}

	async delete(sessionId: string): Promise<void> {
		await this.remove(sessionId);
	}

	async getAll(): Promise<ISession[]> {
		return (await this.search().return.all()) as ISession[];
	}
}
