import {
	Schema,
	Repository,
	type Entity,
	type RedisConnection,
} from "redis-om";
import { redis } from "..";

interface ICachedPracticeQuestion extends Entity {
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

class PracticeQuestionRepository extends Repository {
	constructor(clientOrConnection: RedisConnection) {
		super(schema, clientOrConnection);
		this.createIndex();
	}

	async get(questionName: string) {
		return (await this.fetch(questionName)) as ICachedPracticeQuestion;
	}

	async set(questionName: string, questionData: ICachedPracticeQuestion) {
		return (await this.save(
			questionName,
			questionData,
		)) as ICachedPracticeQuestion;
	}
}

export const PracticeQuestionCache = new PracticeQuestionRepository(redis);
