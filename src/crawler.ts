import puppeteer, { Page } from 'puppeteer';
import userAgent from 'user-agents';
import schedule from 'node-schedule';
import { Pool } from 'mysql2/promise';
import { ResultSetHeader } from 'mysql2';
import { Config } from './types/config';
import { JobList } from './types/index';

export default class Crawler {
    config: Config;
    db: Pool;
    refresh: boolean;

    constructor(config: Config, db: Pool) {
        this.config = config;
        this.db = db;
        this.refresh = false;
    }

    // TODO: 하루에 한 번씩 DB에 저장되어 있는 채용 공고 중 마감인 공고 업데이트하기
    async init() {
        this.refresh = true;

        const jobList = await Promise.all(await this.getWantedJobList());
        const newJobsCount = await this.addJobPosting(jobList);

        console.log(`init: ${newJobsCount} job postings have been added.`);
    }

    async run() {
        console.log(await this.db.query(`SELECT now()`));
        const jobList = await Promise.all(await this.getWantedJobList());
        for (let i = jobList.length - 1; i > jobList.length - 10; i--) {
            console.log(`${i + 1}:`, jobList[i]);
        }
        console.log('length = ', jobList.length);

        // TODO: 페이지 전체 가져와서 저장 중복 시 nothing when 하루에 한 번씩, 서버 시작할 때
        // TODO: 목록에 없으면 삭제. 해야하는데 문제는 오토스크롤 제대로 안 됐을 때 마감 됐다고 생각해서 다 지워버릴수도 있음
        // schedule.scheduleJob('* * * * *', async () => {
        //     await this.init();
        // });

        // 매 시간마다 새로운 채용 공고 있을 시 DB에 저장
        schedule.scheduleJob('30 * * * *', async () => {
            console.log('now: ', new Date());
        });

        // TODO: 하루에 한 번씩 전체 공고 가져와서 닫힌 공고 삭제
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

            console.log('addJobPosting result =>', result);
            return (result[0] as unknown as ResultSetHeader).affectedRows;
        } catch (error) {
            throw error;
        }
    }

    // TODO: 함수명 변경
    // TODO: 1시간에 한 번씩 가져오기
    async getWantedJobList(): Promise<JobList> {
        // Launch the browser and open a new blank page
        const browser = await puppeteer.launch({
            headless: 'new',
            ignoreHTTPSErrors:
                this.config.mode === 'development' ? true : false,
        });
        const page = await browser.newPage();

        // user agent 설정 해줘야 403 안 뜸
        await page.setUserAgent(new userAgent().random().toString());
        await page.goto(this.config.url.wanted);

        console.log(new Date(), 'scroll start!');

        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (this.refresh) {
            await this.autoScroll(page);
        }

        const jobListHandle = await page.$('[data-cy="job-list"]');
        if (jobListHandle == null) {
            // TODO: add error message
            throw new Error();
        }

        const jobCardHandle = await jobListHandle.$$('[data-cy="job-card"]');

        const jobList = [];
        for (const jobCard of jobCardHandle) {
            const positionId: string = await jobCard.$eval('a', (el) => {
                const id = el.getAttribute('data-position-id');
                if (id == null) {
                    throw new Error();
                }

                return id;
            });
            const companyName = await jobCard.$eval(
                '.job-card-company-name',
                (el) => el.innerHTML
            );
            const position = await jobCard.$eval(
                '.job-card-position',
                (el) => el.innerHTML
            );
            const location = await jobCard.$eval(
                '.job-card-company-location',
                (el) => el.innerHTML
            );
            const url = await jobCard.$eval('a', (el) => el.href);

            const jobInfo = {
                id: positionId,
                companyName,
                positionTitle: position,
                location: location.split('<')[0],
                url,
            };

            jobList.push(jobInfo);
        }

        console.log(new Date(), 'scroll finish!');

        await browser.close();

        this.refresh = false;

        return jobList;
    }

    // 가져올 수 있는 데이터 다 가져오기
    async autoScroll(page: Page) {
        page.on('console', (msg) => {
            const msgText = msg.text();
            if (msgText.startsWith('check')) {
                console.log('received msg:', msgText);
            }
        });

        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let tryCount = 0;

                const timer = setInterval(async () => {
                    const scrollHeight = document.body.scrollHeight;
                    console.log(
                        `check - height: ${scrollHeight}, total: ${totalHeight}`
                    );

                    window.scrollTo(0, scrollHeight);
                    await new Promise((resolve) => setTimeout(resolve, 2000));

                    if (totalHeight === scrollHeight) {
                        console.log('total', scrollHeight);

                        if (tryCount === 2) {
                            clearInterval(timer);
                            resolve(true);
                        }

                        tryCount++;
                        console.log('try count ===> ', tryCount);
                    }

                    totalHeight = scrollHeight;
                }, 3000); // 1000으로 했더니 scrollTo보다 먼저 resolve해버려서 3000으로 수정함
            });
        });
    }
}
