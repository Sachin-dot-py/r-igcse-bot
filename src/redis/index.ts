import { createClient } from "redis";
import { client } from "nekdis";
import { client as discordClient } from "..";

export const redis = createClient({ url: process.env.REDIS_URL });
client.redisClient = redis;

redis.on("error", (err) => discordClient.logger.error(err));

await client.connect();

export { QuestionR } from "./schemas/Question";
export { Session } from "./schemas/Session";
// export { StickyMessageR } from "./schemas/StickyMessage";
export { User } from "./schemas/User";
export { View } from "./schemas/View";
export { GuildPreferencesCache } from "./schemas/GuildPreferences";
