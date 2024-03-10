import { Schema, type Entity, Repository, type RedisConnection } from "redis-om";

export interface IPracticeQuestion extends Entity {
	questionName: string;
	questions: string[];
	answers: string | string[];
	solved: boolean;
	userAnswers: {
		solvedBy: string[];
		answersByUsers: string[];
	}[];
	sessionId: string;
}

export const PracticeQuestion = new Schema(
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

export class PracticeQuestionRepository extends Repository {
	constructor(redis: RedisConnection) {
		super(PracticeQuestion, redis);
		this.createIndex();
	}

	async get(questionName: string): Promise<IPracticeQuestion | null> {
		return (await this.fetch(questionName)) as IPracticeQuestion;
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