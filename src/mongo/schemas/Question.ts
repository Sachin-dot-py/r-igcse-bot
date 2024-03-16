import { Schema, model as createModel, Model } from "mongoose";

export interface IQuestion {
	subject: string;
	season: "m" | "s" | "w";
	year: number;
	paper: number;
	variant: number;
	questions: string[];
	answers: string | string[];
	topics: string[];
	questionNumber: number;
	board: string;
}

interface QuestionModel extends Model<IQuestion> {
	getQuestions: (
		subject: string,
		minimumYear: number,
		limit: number,
		topics: string[],
		type: "mcq" | "all",
	) => Promise<IQuestion[]>;
}

const schema = new Schema<IQuestion, QuestionModel>({
	subject: { type: String, required: true },
	season: { type: String, required: true },
	year: { type: Number, required: true },
	paper: { type: Number, required: true },
	variant: { type: Number, required: true },
	questions: { type: [String], required: true },
	answers: { type: Schema.Types.Mixed, required: true },
	topics: { type: [String], required: true, index: true },
	questionNumber: { type: Number, required: true },
	board: { type: String, required: true },
});

schema.statics.getQuestions = async function getQuestions(
	subject: string,
	minimumYear: number,
	limit: number,
	topics: string[],
	type: "mcq" | "all",
) {
	const query = [
		{
			$match: {
				subject: subject,
				year: {
					$gte: minimumYear,
				},
				topics: {
					$elemMatch: { $in: topics },
				},
			},
		},
		{
			$sample: {
				size: limit,
			},
		},
	];
	if (type === "mcq") {
		// @ts-expect-error
		query[0]["$match"]["$expr"] = {
			$eq: [{ $type: "$answers" }, "string"],
		};
	}

	return this.aggregate(query);
};

export const Question = createModel<IQuestion, QuestionModel>(
	"Question",
	schema,
);
