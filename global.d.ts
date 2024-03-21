declare module "bun" {
	interface Env {
		BOT_TOKEN: string;
		MONGO_URL: string;
		REDIS_URL: string;
		MAIN_GUILD_ID: string;
		ERROR_LOGS_CHANNEL_ID: string;
		CHAT_MOD_APPS_CHANNEL_ID: string;
		MOD_FEEDBACK_CHANNEL_ID: string;
		DEV_FEEDBACK_CHANNEL_ID: string;
		[key: string]: string | undefined;
	}
}
