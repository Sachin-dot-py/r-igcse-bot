export const BETA = false;
export const BOT_TOKEN = BETA
	? process.env.BOT_TOKEN_BETA
	: process.env.BOT_TOKEN;
