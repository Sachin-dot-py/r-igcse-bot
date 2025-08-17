import { AutoReply, type IAutoReply } from "@/mongo/schemas/AutoReply";
import {
  type Entity,
  type RedisConnection,
  Repository,
  Schema,
} from "redis-om";

export type ICachedAutoReply = IAutoReply & Entity;

const schema = new Schema("AutoReply", {
  guildId: { type: "string" },
  channelId: { type: "string" },
  reply: { type: "string" },
  sendDm: { type: "boolean" },
});

export class AutoReplyRepository extends Repository {
  constructor(clientOrConnection: RedisConnection) {
    super(schema, clientOrConnection);
  }

  async get(guildId: string, channelId: string) {
    const cachedRes = (await this.fetch(
      `${channelId}-${guildId}`
    )) as ICachedAutoReply;

    if (cachedRes.channelId) return cachedRes;

    const res = await AutoReply.findOne({ guildId, channelId });

    if (!res) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...data } = res.toObject();

    await this.set(data);

    return data as ICachedAutoReply;
  }

  async delete(guildId: string, channelId: string) {
    await this.remove(`${channelId}-${guildId}`);
  }

  async set(autoReply: ICachedAutoReply) {
    await this.save(`${autoReply.channelId}-${autoReply.guildId}`, autoReply);
  }
}
