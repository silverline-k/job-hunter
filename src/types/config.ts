export interface Config {
    mode: string;
    url: {
        wanted: string;
    };
    db: {
        host: string;
        user: string;
        password: string;
        database: string;
        port: number;
    };
}
