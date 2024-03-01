import {
	Schema,
	Repository,
	type Entity,
	type RedisConnection,
} from "redis-om";
import { redis } from "..";

interface ICachedQuestion extends Entity {
	questions: string[];
	answers: string[];
	solved: boolean;
	userAnswers: {
		solvedBy: string[];
		answersByUsers: string[];
	}[];
	sessionId: string;
}

const schema = new Schema("Question", {
	questions: { type: "string[]" },
	answers: { type: "string[]" },
	solved: { type: "boolean" },
	solvedBy: { type: "string[]", path: "$.userAnswers[*]" },
	answersByUsers: { type: "string[]", path: "$.userAnswers[*]" },
	sessionId: { type: "string" },
});

class QuestionRepository extends Repository {
	constructor(clientOrConnection: RedisConnection) {
		super(schema, clientOrConnection);
		this.createIndex();
	}

	async get(questionName: string) {
		return (await this.fetch(questionName)) as ICachedQuestion;
	}

	async set(questionName: string, questionData: ICachedQuestion) {
		return (await this.save(questionName, questionData)) as ICachedQuestion;
	}
}

export const QuestionCache = new QuestionRepository(redis);
