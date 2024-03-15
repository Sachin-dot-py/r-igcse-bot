import { Schema, model as createModel } from "mongoose";

export interface IPracticeSession {
	sessionId: string;
	channelId: string;
	threadId: string;
	subject: string;
	topics: string[];
	limit: number;
	minimumYear: number;
	users: string[];
	owner: string;
	private: boolean;
	currentlySolving: string;
	expireTime: Date;
}

const schema = new Schema<IPracticeSession>({
	sessionId: { type: String, required: true, unique: true },
	channelId: { type: String, required: true },
	threadId: { type: String, required: true },
	subject: { type: String, required: true },
	topics: { type: [String], required: true },
	limit: { type: Number, required: true },
	minimumYear: { type: Number, required: true },
	users: { type: [String], required: true },
	owner: { type: String, required: true },
	private: { type: Boolean, required: true },
	currentlySolving: { type: String, required: true },
	expireTime: { type: Date, required: true },
});

export const PracticeSession = createModel<IPracticeSession>(
	"PracticeSession",
	schema,
);
