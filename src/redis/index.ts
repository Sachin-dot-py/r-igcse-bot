import { createClient } from "redis";

import { GuildPreferencesRepository } from "./schemas/GuildPreferences";
import { StickyMessageRepository } from "./schemas/StickyMessage";
import { PracticeQuestionRepository } from "./schemas/Question";
import { PracticeSessionRepository } from "./schemas/Session";
import { UserRepository } from "./schemas/User";
import { ViewRepository } from "./schemas/View";

export const redis = createClient({
	url: process.env.REDIS_URL,
});

await redis.connect();

export const GuildPreferencesCache = new GuildPreferencesRepository(redis);
export const StickyMessageCache = new StickyMessageRepository(redis);
export const PracticeQuestionCache = new PracticeQuestionRepository(redis);
export const PracticeSessionCache = new PracticeSessionRepository(redis);
export const UserCache = new UserRepository(redis);
export const ViewCache = new ViewRepository(redis);