import { createClient } from "redis";
import { logger } from "..";

export const redis = createClient({
	url: process.env.REDIS_URL,
});

redis.on("error", logger.error);

export { GuildPreferencesCache } from "./schemas/GuildPreferences";
export { StickyMessageCache } from "./schemas/StickyMessage";
export { PracticeQuestionCache } from "./schemas/Question";
export { PracticeSessionCache } from "./schemas/Session";
// export { PracticeUserCache } from "./schemas/User";
// export { PracticeViewCache } from "./schemas/View";
