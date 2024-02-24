declare global {
	namespace NodeJS {
		interface ProcessEnv {
			BOT_TOKEN: string;
			MONGO_URL: string;
			REDIS_URL: string;
			[key: string]: string | undefined;
		}
	}
}

export {};
