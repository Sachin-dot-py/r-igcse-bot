import SessionInfoModal from "@/components/practice/SessionInfoModal";
import {
	Schema,
	Repository,
	type RedisConnection,
	type Entity,
} from "redis-om";

interface IPracticeSession extends Entity {
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

const schema = new Schema("Session", {
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
});

export class PracticeSessionRepository extends Repository {
	constructor(clientOrConnection: RedisConnection) {
		super(schema, clientOrConnection);
		this.createIndex();
	}

	async get(sessionId: string) {
		const session = await this.fetch(sessionId) as IPracticeSession;
		if (session.sessionId === undefined) {
			return null;
		}
		return session;
	}

	async set(sessionId: string, sessionData: IPracticeSession) {
		return (await this.save(sessionId, sessionData)) as IPracticeSession;
	}
}
