import { createClient, type RedisClientType } from "redis";
import { UserRepo } from "./schemas/User";
import { QuestionRRepo } from "./schemas/Question";
import { SessionRepo } from "./schemas/Session";
import { StickyMessageRepo } from "./schemas/StickyMessage";
import { ViewRepo } from "./schemas/View";
import { client } from "..";

export const redis = createClient({ url: process.env.REDIS_URL });

redis.on("error", (err) => client.logger.error(err));

await redis.connect();

export const User = new UserRepo(redis as RedisClientType);
export const QuestionR = new QuestionRRepo(redis as RedisClientType);
export const Session = new SessionRepo(redis as RedisClientType);
export const StickyMessage = new StickyMessageRepo(redis as RedisClientType);
export const View = new ViewRepo(redis as RedisClientType);
