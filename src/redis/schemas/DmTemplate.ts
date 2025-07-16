import { DmTemplate, type IDmTemplate } from "@/mongo/schemas/DmTemplate";
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
    const cachedRes = (await this.fetch(`${guildId}:${name}`)) as ICachedDmTemplate;
    if (cachedRes?.name) return cachedRes;

    const res = await DmTemplate.findOne({ guildId, name });
    if (!res) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { _id, ...data } = res.toObject();

    await this.create(data);
    return data as ICachedDmTemplate;
  }

  async create(data: ICachedDmTemplate) {
    await this.save(`${data.guildId}:${data.name}`, data);
  }

  async update(guildId: string, name: string, data: ICachedDmTemplate) {
    await this.update(guildId, name, data)
  }

  async delete(guildId: string, name: string) {
    await this.remove(`${guildId}:${name}`);
  }

  async getAll(guildId: string) {
    const cachedTemplates = await this.search().where("guildId").equals(guildId).return.all();
    if (cachedTemplates.length > 0) return cachedTemplates as ICachedDmTemplate[];
    const res = await DmTemplate.find({ guildId });
    if (!res) return null;
    const templates: ICachedDmTemplate[] = res.map((template) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
	  	const { _id, ...data } = template.toObject();
      return data;
    });
    for (const template of templates) {
      await this.create(guildId, template.name, template);
    }
    return templates;
  }
}
