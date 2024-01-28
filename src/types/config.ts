export interface Config {
    mode: string;
    url: {
        wanted: {
            default: string;
            nodejs: string;
        };
    };
    db: {
        host: string;
        user: string;
        password: string;
        database: string;
        port: number;
    };
    limitRetryCount: number;
}
