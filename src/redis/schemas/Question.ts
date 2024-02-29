import { Schema, Repository } from "redis-om";
import { redis } from "..";

const schema = new Schema("Question", {
	questionName: { type: "string[]" },
	questions: { type: "string[]" },
	answers: { type: "string" },
	solved: { type: "boolean" },
	solvedBy: { type: "string[]", path: "$.userAnswers[*]" },
	answersByUsers: { type: "string[]", path: "$.userAnswers[*]" },
	sessionId: { type: "string" },
});

export const QuestionCache = new Repository(schema, redis);
