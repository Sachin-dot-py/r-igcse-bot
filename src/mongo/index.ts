import mongo from 'mongoose';

await mongo.connect(process.env.MONGO_LINK);
