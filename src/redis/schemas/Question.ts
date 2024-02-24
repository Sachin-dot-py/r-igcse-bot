import type { RedisClientType } from "redis";
import { Schema, type Entity, Repository } from "redis-om";

export interface IQuestionR extends Entity {
	questionName: string;
	questions: string[];
	answers: string | string[];
	solved: boolean;
	userAnswers: any[];
	sessionId: string;
}

export const QuestionR = new Schema(
	"Question",
	{
		questionName: { type: "string" },
		questions: { type: "string[]" },
		answers: { type: "string" },
		solved: { type: "boolean" },
		solvedBy: { type: "string[]", path: "$.userAnswers[*].user" },
		answersByUsers: { type: "string[]", path: "$.userAnswers[*].answer" },
		sessionId: { type: "string" },
	},
	{
		dataStructure: "JSON",
	},
);

export class QuestionRRepo extends Repository {
	constructor(redis: RedisClientType) {
		super(QuestionR, redis);
		this.createIndex();
	}

	async get(questionName: string): Promise<IQuestionR | null> {
		return (await this.fetch(questionName)) as IQuestionR;
	}

	async set(questionName: string, data: IQuestionR): Promise<void> {
		await this.save(questionName, data);
	}

	async delete(questionName: string): Promise<void> {
		await this.remove(questionName);
	}

	async getAll(): Promise<IQuestionR[]> {
		return (await this.search().return.all()) as IQuestionR[];
	}
}
