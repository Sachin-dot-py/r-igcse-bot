import { Schema, model as createModel } from "mongoose";

export interface IGetRoleQnA {
	question: string;
	answers: string[];
    label: string;
}

const schema = new Schema<IGetRoleQnA>({
	question: { type: String, required: true },
    label: { type: String, required: true },
	answers: { type: [String], required: true },
});

export const GetRoleQnA = createModel<IGetRoleQnA>("GetRoleQnA", schema);