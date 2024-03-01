// import { Repository, Schema, type Entity } from "redis-om";
// import { redis } from "..";

// interface ICachedStickyMessage extends Entity {
// 	channelId: string;
// 	messageId: string;
// 	embedTitles: string[];
// 	enabled: boolean;
// }

// const schema = new Schema("StickyMessage", {
// 	channelId: { type: "string" },
// 	messageId: { type: "string" },
// 	// embed: { type: "" },
// 	stickTime: { type: "string" },
// 	unstickTime: { type: "string" },
// 	enabled: { type: "boolean" },
// });

// export const StickyMessageCache = new Repository(schema, redis);
