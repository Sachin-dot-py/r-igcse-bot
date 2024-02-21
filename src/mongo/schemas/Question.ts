import { Schema, model as createModel } from 'mongoose';

export interface IQuestion {}

const schema = new Schema<IQuestion>({});

export const Question = createModel<IQuestion>('Question', schema);
