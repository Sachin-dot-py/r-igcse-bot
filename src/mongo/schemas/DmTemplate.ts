import { Schema, model as createModel } from "mongoose";

export interface IDmTemplate {
  guildId: string;
  name: string; // unique per guild
  message: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IDmTemplate>({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  message: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

schema.index({ guildId: 1, name: 1 }, { unique: true });

export const DmTemplate = createModel<IDmTemplate>("DmTemplate", schema);
