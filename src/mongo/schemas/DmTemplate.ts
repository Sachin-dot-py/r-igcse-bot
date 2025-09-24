import { Schema, model as createModel } from "mongoose";

export interface IDmTemplate {
  guildId: string;
  name: string; // unique per guild
  message: string;
}

const schema = new Schema<IDmTemplate>({
  guildId: { type: String, required: true },
  name: { type: String, required: true },
  message: { type: String, required: true },
});

schema.index({ guildId: 1, name: 1 }, { unique: true });

export const DmTemplate = createModel<IDmTemplate>("DmTemplate", schema);
