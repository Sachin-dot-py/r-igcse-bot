import mongo from 'mongoose';

await mongo.connect(process.env.MONGO_LINK);

export { Punishment, type IPunishment } from './schemas/Punishment';
export { Keyword, type IKeyword } from './schemas/Keyword';
