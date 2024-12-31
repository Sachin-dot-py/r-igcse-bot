import { Schema, model as createModel } from "mongoose";

export interface IGetRoleAttempt {
	guildId: string;
	userId: string;
	questions: string[];
}

const schema = new Schema<IGetRoleAttempt>({
	guildId: { type: String, required: true },
	userId: { type: String, required: true },
	questions: { type: [String], required: true },
});

export const GetRoleAttempt = createModel<IGetRoleAttempt>(
	"GetRoleAttempt",
	schema,
);
