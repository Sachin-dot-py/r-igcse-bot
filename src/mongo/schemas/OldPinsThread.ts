import { Schema, model as createModel } from "mongoose";

export interface IOldPinsThread {
	channelId: string;
	oldPinsThreadId: string;
}

const schema = new Schema<IOldPinsThread>({
	channelId: { type: String, required: true, unique: false },
	oldPinsThreadId: { type: String, required: true, unique: false },
});

export const OldPinsThread = createModel<IOldPinsThread>(
	"OldPinsThread",
	schema,
);
