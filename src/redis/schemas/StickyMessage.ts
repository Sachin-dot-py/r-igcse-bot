import type { IStickyMessage } from "@/mongo";
import {
	Repository,
	Schema,
	type Entity,
	type RedisConnection
} from "redis-om";

export type ICachedStickyMessage = Omit<
	Omit<IStickyMessage, "stickTime">,
	"unstickTime"
> &
	Entity;

const schema = new Schema("StickyMessage", {
	channelId: { type: "string" },
	messageId: { type: "string" },
	embeds: { type: "string[]" }
});

export class StickyMessageRepository extends Repository {
	constructor(clientOrConnection: RedisConnection) {
		super(schema, clientOrConnection);
	}

	async get(id: string) {
		const res = await this.fetch(id);
		if (!res.channelId) {
			return null;
		}
		res.embeds = (res.embeds as string[]).map((embed) => JSON.parse(embed));

		return res as ICachedStickyMessage;
	}

	async set(
		id: string,
		stickyMessageData: Omit<
			Omit<IStickyMessage, "stickTime">,
			"unstickTime"
		>
	) {
		const data = {
			...stickyMessageData,
			embeds: stickyMessageData.embeds.map((embed) =>
				JSON.stringify(embed)
			)
		};

		await this.save(id, data);
		await this.expire(id, 60);
	}
}
