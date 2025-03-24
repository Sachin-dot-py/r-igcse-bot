declare module "bun" {
	interface Env {
		BOT_TOKEN: string;
		MONGO_URL: string;
		REDIS_URL: string;
		MAIN_GUILD_ID: string;
		ERROR_LOGS_CHANNEL_ID: string;
		DEV_FEEDBACK_CHANNEL_ID: string;
		RESULT_REMINDER_CHANNEL_ID: string;
		[key: string]: string | undefined;
	}
}
