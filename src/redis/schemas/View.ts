import type { RedisClientType } from "redis";
import { Schema, type Entity, Repository } from "redis-om";

export interface IView extends Entity {
	viewId: string;
	messageId: string;
}

export const View = new Schema(
	"View",
	{
		viewId: { type: "string" },
		messageId: { type: "string" },
	},
	{
		dataStructure: "JSON",
	},
);

export class ViewRepo extends Repository {
	constructor(redis: RedisClientType) {
		super(View, redis);
		this.createIndex();
	}

	async get(viewId: string): Promise<IView | null> {
		return (await this.fetch(viewId)) as IView;
	}

	async set(viewId: string, data: IView): Promise<void> {
		await this.save(viewId, data);
	}

	async delete(viewId: string): Promise<void> {
		await this.remove(viewId);
	}

	async getAll(): Promise<IView[]> {
		return (await this.search().return.all()) as IView[];
	}
}
