declare global {
    namespace NodeJS {
        interface ProcessEnv {
            BOT_TOKEN: string;
            [key: string]: string | undefined;
        }
    }
}

export {};
