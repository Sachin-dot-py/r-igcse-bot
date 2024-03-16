import { createClient } from "redis";

import { GuildPreferencesRepository } from "./schemas/GuildPreferences";
import { DmGuildPreferenceRepository } from "./schemas/DmGuildPreference";
import { StickyMessageRepository } from "./schemas/StickyMessage";
import { PracticeQuestionRepository } from "./schemas/Question";
import { UserRepository } from "./schemas/User";
import { ButtonInteractionRepository } from "./schemas/ButtonInteraction";

export const redis = createClient({
	url: process.env.REDIS_URL,
});

await redis.connect();

export const GuildPreferencesCache = new GuildPreferencesRepository(redis);
export const DmGuildPreferenceCache = new DmGuildPreferenceRepository(redis);
export const StickyMessageCache = new StickyMessageRepository(redis);
export const PracticeQuestionCache = new PracticeQuestionRepository(redis);
export const UserCache = new UserRepository(redis);
export const ButtonInteractionCache = new ButtonInteractionRepository(redis);

await GuildPreferencesCache.createIndex();
await DmGuildPreferenceCache.createIndex();
await StickyMessageCache.createIndex();
await PracticeQuestionCache.createIndex();
await UserCache.createIndex();
await ButtonInteractionCache.createIndex();

await redis.disconnect();
