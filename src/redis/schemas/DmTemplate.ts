import type { IDmTemplate } from "@/mongo/schemas/DmTemplate";
import {
  type Entity,
  type RedisConnection,
  Repository,
  Schema,
} from "redis-om";

export interface ICachedDmTemplate extends IDmTemplate, Entity {}

const schema = new Schema("DmTemplate", {
  guildId: { type: "string" },
  name: { type: "string" },
  message: { type: "string" },
});

export class DmTemplateRepository extends Repository<ICachedDmTemplate> {
  constructor(clientOrConnection: RedisConnection) {
    super(schema, clientOrConnection);
  }

  async get(guildId: string, name: string) {
    return (await this.fetch(`${guildId}:${name}`)) as ICachedDmTemplate;
  }

  async set(guildId: string, name: string, data: ICachedDmTemplate) {
    await this.save(`${guildId}:${name}`, data);
  }

  async delete(guildId: string, name: string) {
    await this.remove(`${guildId}:${name}`);
  }

  async getAll(guildId: string): Promise<ICachedDmTemplate[]> {
    return (await this.search().where("guildId").equal(guildId).return.all()) as ICachedDmTemplate[];
  }
}
