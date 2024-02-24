import { Schema, model as createModel } from "mongoose";

export interface IReactionRole {
	reaction: string;
	role: string;
	message: number;
}

const schema = new Schema<IReactionRole>({
	reaction: { type: String, required: true },
	role: { type: String, required: true },
	message: { type: Number, required: true },
});

export const ReactionRole = createModel<IReactionRole>("ReactionRole", schema);
