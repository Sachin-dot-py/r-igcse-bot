import { Schema, model as createModel } from "mongoose";

export interface IQuestion {
	subject: string;
	season: "m" | "s" | "w";
	year: number;
	paper: number;
	variant: number;
	questions: string[];
	answers: string | string[];
	topics: string[];
}

const schema = new Schema<IQuestion>({
	subject: { type: String, required: true },
	season: { type: String, required: true },
	year: { type: Number, required: true },
	paper: { type: Number, required: true },
	variant: { type: Number, required: true },
	questions: { type: [String], required: true },
	answers: { type: Schema.Types.Mixed, required: true },
	topics: { type: [String], required: true },
});

export const Question = createModel<IQuestion>("Question", schema);
