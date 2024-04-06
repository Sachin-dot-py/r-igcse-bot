import { Schema, model as createModel } from "mongoose";

export interface IReactionRole {
	emoji: string;
	roleId: string;
	messageId: string;
}

const schema = new Schema<IReactionRole>({
	emoji: { type: String, required: true },
	roleId: { type: String, required: true },
	messageId: { type: String, required: true }
});

export const ReactionRole = createModel<IReactionRole>("ReactionRole", schema);
