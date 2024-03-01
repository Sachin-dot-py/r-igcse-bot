import {
	Schema,
	Repository,
	type RedisConnection,
	type Entity,
} from "redis-om";
import { redis } from "..";

interface ICachedPracticeSession extends Entity {
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

const schema = new Schema("Session", {
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
});

class PracticeSessionRepository extends Repository {
	constructor(clientOrConnection: RedisConnection) {
		super(schema, clientOrConnection);
		this.createIndex();
	}

	async get(sessionId: string) {
		return (await this.fetch(sessionId)) as ICachedPracticeSession;
	}

	async set(sessionId: string, sessionData: ICachedPracticeSession) {
		return (await this.save(sessionId, sessionData)) as ICachedPracticeSession;
	}
}

export const PracticeSessionCache = new PracticeSessionRepository(redis);
