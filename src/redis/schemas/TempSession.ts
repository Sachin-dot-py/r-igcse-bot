import {
	Schema,
	Repository,
	type RedisConnection,
	type Entity,
} from "redis-om";

interface ITempPracticeSession extends Entity {
	channelId?: string;
	threadId?: string;
	subject?: string;
	topics?: string[];
	limit?: number;
	minimumYear?: number;
	users?: string[];
	owner?: string;
	private?: boolean;
	paused?: boolean;
	currentlySolving?: string;
	expireTime?: Date;
}

const schema = new Schema("TempSession", {
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

export class TempPracticeSessionRepository extends Repository {
	constructor(clientOrConnection: RedisConnection) {
		super(schema, clientOrConnection);
		this.createIndex();
	}

	async get(sessionId: string) {
		return (await this.fetch(sessionId)) as ITempPracticeSession;
	}

	async set(sessionId: string, sessionData: ITempPracticeSession) {
		return (await this.save(sessionId, sessionData)) as ITempPracticeSession;
	}
}
