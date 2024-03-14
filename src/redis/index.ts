import { createClient } from "redis";

import { GuildPreferencesRepository } from "./schemas/GuildPreferences";
import { DmGuildPreferenceRepository } from "./schemas/DmGuildPreference";
import { StickyMessageRepository } from "./schemas/StickyMessage";
import { PracticeQuestionRepository } from "./schemas/Question";
import { PracticeSessionRepository } from "./schemas/Session";

export const redis = createClient({
	url: process.env.REDIS_URL,
});

await redis.connect();

export const GuildPreferencesCache = new GuildPreferencesRepository(redis);
export const DmGuildPreferenceCache = new DmGuildPreferenceRepository(redis);
export const StickyMessageCache = new StickyMessageRepository(redis);
export const PracticeQuestionCache = new PracticeQuestionRepository(redis);
export const PracticeSessionCache = new PracticeSessionRepository(redis);

// import { PracticeUserCache } from "./schemas/User";
// import { PracticeViewCache } from "./schemas/View";
