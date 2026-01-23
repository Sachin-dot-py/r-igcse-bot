import { Schema, model as createModel } from "mongoose";

export interface IQuestionOfTheWeek {
    guildId: string;
    question: string;
    asked?: boolean | null;
}

const schema = new Schema<IQuestionOfTheWeek>({
    guildId: { type: String, required: true },
    question: { type: String, required: true },
    asked: { type: Boolean, required: false },
});

export const QuestionOfTheWeek = createModel<IQuestionOfTheWeek>(
    "QuestionOfTheWeek",
    schema
);
