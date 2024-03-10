import { Schema, type Entity, Repository, type RedisConnection } from "redis-om";

export interface IView extends Entity {
	viewId: string;
	messageId: string;
}

export const View = new Schema(
	"View",
	{
		viewId: { type: "string" },
		messageId: { type: "string" },
	}
);

export class ViewRepository extends Repository {
	constructor(redis: RedisConnection) {
		super(View, redis);
		this.createIndex();
	}

	async get(viewId: string): Promise<IView | null> {
		return (await this.fetch(viewId)) as IView;
	}

	async set(viewId: string, data: IView): Promise<void> {
		await this.save(viewId, data);
	}

	async getAll(): Promise<IView[]> {
		return (await this.search().return.all()) as IView[];
	}
}
