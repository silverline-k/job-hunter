import puppeteer, { Page, Browser } from 'puppeteer';
import userAgent from 'user-agents';
import { Config } from './types/config';
import { JobInfo, JobList, PositionIndex } from './types/index';
import Repository from './repository';

export default class Crawler {
    config: Config;
    repository: Repository;

    constructor(config: Config, repository: Repository) {
        this.config = config;
        this.repository = repository;
    }

    async launch(): Promise<Browser> {
        const browser = await puppeteer.launch({
            headless: 'new',
            ignoreHTTPSErrors:
                this.config.mode === 'development' ? true : false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ],
        });

        return browser;
    }

    async setPage(browser: Browser): Promise<Page> {
        const page = await browser.newPage();

        // user agent 설정 해줘야 403 안 뜸
        await page.setUserAgent(new userAgent().random().toString());
        await page.goto(this.config.url.wanted);

        page.on('console', (msg) => {
            const msgText = msg.text();
            if (msgText.startsWith('check')) {
                console.log('received msg:', msgText);
            }
        });

        return page;
    }

    async run() {
        let newJobsCount = 0;
        let closedJobsCount = 0;

        const positionIndexesFromDB =
            await this.repository.getPositionIndexes();
        const positionIndexesFromWanted =
            await this.getPositionIndexesFromWanted();

        const newIndexes = new Set<PositionIndex>();
        const closedIndexes = new Set<PositionIndex>(positionIndexesFromDB);

        positionIndexesFromDB.forEach((index) => {
            if (positionIndexesFromWanted.has(index)) {
                closedIndexes.delete(index);
            }
        });

        positionIndexesFromWanted.forEach((index) => {
            if (!positionIndexesFromDB.has(index)) {
                newIndexes.add(index);
            }
        });

        console.log(`from db => ${positionIndexesFromDB.size} | from wanted => ${positionIndexesFromWanted.size} | new => ${newIndexes.size} | close => ${closedIndexes.size}`);

        // TODO: JD 긁어오기

        if (closedIndexes.size > 0) {
            closedJobsCount = await this.repository.deleteJobPosting(Array.from(closedIndexes.values()));
            console.log('close count =>', closedJobsCount);
        }
        if (newIndexes.size > 0) {
            // newJobsCount = await this.repository.addJobPosting([]);
        }

        console.log(`run: ${newJobsCount} job postings have been added.`);
        console.log(`run: ${closedJobsCount} job postings have been closed.`);
    }

    async getPositionIndexesFromWanted(): Promise<Set<PositionIndex>> {
        const browser = await this.launch();
        const page = await this.setPage(browser);

        console.log(new Date(), 'scroll start!');

        await new Promise((resolve) => setTimeout(resolve, 3000));

        const jobListWrapperSelector =
            '.JobList_contentWrapper__QiRRW .List_List__FsLch li';
        await page.waitForSelector(jobListWrapperSelector);

        await this.autoScroll(page);

        const positionIndexList: PositionIndex[] = [];

        const jobCards = await page.$$(jobListWrapperSelector);
        for (const jobCard of jobCards) {
            const positionIndex = await jobCard.$eval('a', (el) => {
                return el.getAttribute('data-position-id');
            });

            if (positionIndex !== null) {
                positionIndexList.push(Number(positionIndex));
            }
        }

        console.log(new Date(), 'scroll finish!');

        await browser.close();

        return new Set(positionIndexList);
    }

    async getJobCardsFromWanted(page: Page, element: string) {
        await page.waitForSelector(element);

        const jobList: JobList = [];
        const jobCards = await page.$$(element);
        console.log(jobCards);

        for (const jobCard of jobCards) {
            const jobInfo = await jobCard.$eval('a', (el) => {
                const id = el.getAttribute('data-position-id');
                const companyName = el.getAttribute('data-company-name');
                const positionTitle = el.getAttribute('data-position-name');
                const location = ''; // TODO: 태그에서 지역 속성 사라졌음, 어디에서 가져올지 정해야함
                const url = el.href;

                if (
                    [id, companyName, positionTitle, location, url].includes(
                        null
                    )
                ) {
                    // TODO: add error message
                    throw new Error();
                }

                console.log('check', id);

                return {
                    id,
                    companyName,
                    positionTitle,
                    location,
                    url,
                };
            });

            if (jobInfo !== null) {
                jobList.push(jobInfo as JobInfo);
            }
        }

        return jobList;
    }

    async getJobListFromWanted(): Promise<JobList> {
        const browser = await this.launch();
        const page = await this.setPage(browser);

        console.log(new Date(), 'scroll start!');

        await new Promise((resolve) => setTimeout(resolve, 3000));

        const jobListWrapperSelector =
            '.JobList_contentWrapper__QiRRW .List_List__FsLch li';
        await page.waitForSelector(jobListWrapperSelector);

        await this.autoScroll(page);

        const jobList = await this.getJobCardsFromWanted(
            page,
            jobListWrapperSelector
        );

        console.log(new Date(), 'scroll finish!');

        await browser.close();

        return jobList as JobList;
    }

    async autoScroll(page: Page) {
        await page.evaluate(async () => {
            await new Promise(async (resolve) => {
                let totalHeight = 0;

                window.scrollTo(0, 2000);
                await new Promise((resolve) => setTimeout(resolve, 3000));

                const timer = setInterval(async () => {
                    const scrollHeight = document.body.scrollHeight;
                    console.log(
                        `check - height: ${scrollHeight}, total: ${totalHeight}`
                    );

                    window.scrollBy(0, scrollHeight);

                    if (totalHeight === scrollHeight) {
                        clearInterval(timer);
                        resolve(true);
                    }

                    totalHeight = scrollHeight;
                }, 3000); // scrollBy보다 먼저 실행돼서 3000으로 수정함
            });
        });
    }
}
