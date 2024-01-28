import { Pool } from 'mysql2/promise';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { JobList, PositionIndex } from './types/index';

export default class Repository {
    db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async getPositionIndexes(): Promise<Set<PositionIndex>> {
        const [rows, _] = await this.db.execute(
            `SELECT position_index FROM job_hunter.job_posting WHERE deleted_at IS NULL`
        );
        const positionIndexes = (rows as unknown as RowDataPacket).map(
            (row: { position_index: number }) => row.position_index
        );

        return new Set(positionIndexes);
    }

    async addJobPosting(jobList: JobList): Promise<number> {
        const placeholders = new Array(jobList.length)
            .fill(`(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .join(',');

        const values = jobList.reduce((acc, job) => {
            acc.push(
                job.id,
                job.positionName,
                job.positionTitle,
                job.companyName,
                job.companyLocation,
                job.companyAddress,
                job.url,
                job.mainResponsibilities,
                job.qualifications,
                job.preferences,
                job.welfareBenefits,
                job.closingDate,
            );

            return acc;
        }, [] as any[]);

        try {
            const result = await this.db.execute(
                `
                INSERT INTO job_hunter.job_posting
                (
                    position_index,
                    position_name,
                    position_title,
                    company_name,
                    company_location,
                    company_address,
                    url,
                    mainResponsibilities,
                    qualifications,
                    preferences,
                    welfareBenefits,
                    closing_date
                )
                VALUES ${placeholders}
                ON DUPLICATE KEY UPDATE deleted_at = CASE
                    WHEN deleted_at IS NOT NULL THEN NULL
                    ELSE deleted_at
                END;
            `,
                values,
            );

            return (result[0] as unknown as ResultSetHeader).affectedRows;
        } catch (error) {
            throw error;
        }
    }

    async deleteJobPosting(indexList: PositionIndex[]): Promise<number> {
        const placeholders = new Array(indexList.length).fill('?').join(',');

        try {
            const result = await this.db.execute(
                `
                UPDATE job_hunter.job_posting
                SET deleted_at = NOW()
                WHERE position_index IN (${placeholders})
            `,
                indexList
            );

            return (result[0] as unknown as ResultSetHeader).affectedRows;
        } catch (error) {
            throw error;
        }
    }
}
