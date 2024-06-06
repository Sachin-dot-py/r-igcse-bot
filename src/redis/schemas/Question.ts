import {
	type Entity,
	type RedisConnection,
	Repository,
	Schema,
} from "redis-om";

export type PracticeQuestionResponse = {
	user: string;
	answer: string;
};

export interface IPracticeQuestion extends Entity {
	questionName: string;
	questions: string[];
	answers: string | string[];
	solved: boolean;
	userAnswers: PracticeQuestionResponse[];
	sessionId: string;
}

export const PracticeQuestion = new Schema("Question", {
	questionName: { type: "string" },
	questions: { type: "string[]" },
	answers: { type: "string" },
	solved: { type: "boolean" },
	solvedBy: { type: "string[]", path: "$.userAnswers[*].user" },
	answersByUsers: { type: "string[]", path: "$.userAnswers[*].answer" },
	sessionId: { type: "string" },
});

export class PracticeQuestionRepository extends Repository {
	constructor(redis: RedisConnection) {
		super(PracticeQuestion, redis);
	}

	async get(questionName: string): Promise<IPracticeQuestion | null> {
		const question = (await this.fetch(questionName)) as IPracticeQuestion;
		if (!question.questionName) {
			return null;
		}
		return question;
	}

	async set(questionName: string, data: IPracticeQuestion): Promise<void> {
		await this.save(questionName, data);
	}

	async delete(questionName: string): Promise<void> {
		await this.remove(questionName);
	}

	async getAll(): Promise<IPracticeQuestion[]> {
		return (await this.search().return.all()) as IPracticeQuestion[];
	}
}
