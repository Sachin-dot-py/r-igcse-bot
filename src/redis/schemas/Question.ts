import { client, Schema } from "nekdis";

const schema = new Schema({
	questionName: { type: "array" },
	questions: { type: "array" },
	answers: { type: "string" },
	solved: { type: "boolean" },
	userAnswers: {
		type: "object",
		properties: {
			solvedBy: { type: "array" },
			answersByUsers: { type: "array" },
		},
	},
	sessionId: { type: "string" },
});

export const QuestionR = client.model("Question", schema);
