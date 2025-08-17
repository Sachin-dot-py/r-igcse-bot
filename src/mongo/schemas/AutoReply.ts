import { Schema, model as createModel } from "mongoose";

export interface IAutoReply {
  guildId: string;
  channelId: string;
  reply: string;
  sendDm: boolean;
}

const schema = new Schema<IAutoReply>({
  guildId: { type: String, required: true, unique: false },
  channelId: { type: String, required: true, unique: true },
  reply: { type: String, required: true, unique: false },
  sendDm: { type: Boolean, required: true, unique: false },
});

export const AutoReply = createModel<IAutoReply>("AutoReply", schema);
