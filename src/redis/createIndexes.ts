import { createClient } from "redis";

import { GuildPreferencesRepository } from "./schemas/GuildPreferences";
import { StickyMessageRepository } from "./schemas/StickyMessage";
import { PracticeQuestionRepository } from "./schemas/Question";
import { UserRepository } from "./schemas/User";
import { ButtonInteractionRepository } from "./schemas/ButtonInteraction";
import { KeywordRepository } from "./schemas/Keyword";

export const redis = createClient({
	url: process.env.REDIS_URL
});

await redis.connect();

const GuildPreferencesCache = new GuildPreferencesRepository(redis);
const StickyMessageCache = new StickyMessageRepository(redis);
const PracticeQuestionCache = new PracticeQuestionRepository(redis);
const UserCache = new UserRepository(redis);
const ButtonInteractionCache = new ButtonInteractionRepository(redis);
const KeywordCache = new KeywordRepository(redis);

await GuildPreferencesCache.createIndex();
await StickyMessageCache.createIndex();
await PracticeQuestionCache.createIndex();
await UserCache.createIndex();
await ButtonInteractionCache.createIndex();
await KeywordCache.createIndex();

await redis.disconnect();
