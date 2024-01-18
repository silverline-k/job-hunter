import mysql, { Pool } from 'mysql2/promise';
import { Config } from './types/config';

export default class DBConnector {
    config: Config;
    pool: Pool;

    constructor(config: Config) {
        this.config = config;
        this.pool = this.createPool();
    }

    createPool(): Pool {
        return mysql.createPool({
            host: this.config.db.host,
            user: this.config.db.user,
            password: this.config.db.password,
            database: this.config.db.database,
            port: this.config.db.port,
            connectionLimit: 100,
            charset: 'utf8mb4'
        });
    }
}
