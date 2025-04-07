declare module "bun" {
	interface Env {
		BOT_TOKEN: string;
		MONGO_URL: string;
		REDIS_URL: string;
		MAIN_GUILD_ID: string;
		ERROR_LOGS_CHANNEL_ID: string;
		DEV_FEEDBACK_CHANNEL_ID: string;
		BOT_DEV_ROLE_ID: string;
		[key: string]: string | undefined;
	}
}
