declare global {
    namespace NodeJS {
        interface ProcessEnv {
            BOT_TOKEN: string;
            MONGO_LINK: string;
            [key: string]: string | undefined;
        }
    }
}

export {};
