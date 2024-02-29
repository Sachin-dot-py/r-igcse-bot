export const BETA = false;
export const PRIMARY_GUILD_ID = "576460042774118420";
export const FALLBACK_MODLOG_CHANNEL_ID = "894596848357089330"; // Also PRIMARY_MODLOG_CHANNEL_ID
export const BOT_TOKEN = BETA
	? process.env.BOT_TOKEN_BETA
	: process.env.BOT_TOKEN;
