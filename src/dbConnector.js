import mysql from 'mysql2/promise';

export default class DBConnector {
    constructor(config) {
        this.config = config;
    }

    createPool() {
        return mysql.createPool({
            host: this.config.db.host,
            user: this.config.db.user,
            password: this.config.db.password,
            database: this.config.db.database,
            port: this.config.db.port,
            connectionLimit: 100,
        });
    }
}
