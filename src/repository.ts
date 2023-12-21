import { Pool } from 'mysql2/promise';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { JobList } from './types/index';

export default class Repository {
    db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async getLastPositionIndex(): Promise<number> {
        const [rows, _] = await this.db.query(`SELECT max(position_index) AS last_position_index FROM job_hunter.job_posting`);

        return (rows as unknown as RowDataPacket)[0].last_position_index;
    }

    async addJobPosting(jobList: JobList): Promise<number> {
        const position = 'nodejs';
        const values = jobList
            .map((job) => {
                return `(${job.id}, '${position}', '${job.positionTitle}', '${job.companyName}', '${job.location}', '${job.url}')`;
            })
            .join(',');

        try {
            const result = await this.db.query(`
                INSERT IGNORE INTO job_hunter.job_posting
                (
                    position_index,
                    position_name,
                    position_title,
                    company_name,
                    company_location,
                    url
                )
                VALUES ${values}
            `);

            return (result[0] as unknown as ResultSetHeader).affectedRows;
        } catch (error) {
            throw error;
        }
    }
}
