import puppeteer, { Page, Browser } from 'puppeteer';
import userAgent from 'user-agents';
import { Config } from './types/config';
import { JobInfo, PositionIndex, JobDescription } from './types/index';
import Repository from './repository';
import { DiscordConnector } from './discord-connector';
import { delay } from './utils/async';

export default class Crawler {
    config: Config;
    retryCount: number;
    limitRetryCount: number;
    repository: Repository;
    discordConnector: DiscordConnector;

    constructor(
        config: Config,
        repository: Repository,
        discordConnector: DiscordConnector
    ) {
        this.config = config;
        this.retryCount = 0;
        this.limitRetryCount = config.limitRetryCount;
        this.repository = repository;
        this.discordConnector = discordConnector;
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
            executablePath: process.env.CHROME_PATH || undefined,
        });

        return browser;
    }

    async setPage(browser: Browser, url: string): Promise<Page> {
        const page = await browser.newPage();

        // user agent 설정 해줘야 403 안 뜸
        await page.setUserAgent(new userAgent().random().toString());
        await page.goto(url);

        await delay(2500);

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

        console.log(
            `from db => ${positionIndexesFromDB.size} | from wanted => ${positionIndexesFromWanted.size} | new => ${newIndexes.size} | close => ${closedIndexes.size}`
        );

        if (closedIndexes.size > 0) {
            closedJobsCount = await this.repository.deleteJobPosting(
                Array.from(closedIndexes.values())
            );
            console.log('close count =>', closedJobsCount);
        }

        // 상세내용 가져올 때 오래 걸리기 때문에 나눠서 저장하도록 한다.
        if (newIndexes.size > 0) {
            for (const index of newIndexes) {
                const jobInfo = await this.getJobPosting(index.toString());
                const result = await this.repository.addJobPosting([jobInfo]);
                newJobsCount = newJobsCount + result;

                const data = this.discordConnector.parseData(jobInfo);
                this.discordConnector.send(data);

                console.log(
                    new Date(),
                    `index(${newJobsCount}) ->`,
                    index
                );
            }
        }

        console.log(`run: ${newJobsCount} job postings have been added.`);
        console.log(`run: ${closedJobsCount} job postings have been closed.`);
    }

    async getPositionIndexesFromWanted(): Promise<Set<PositionIndex>> {
        const url =
            this.config.url.wanted.default +
            '/' +
            this.config.url.wanted.nodejs;
        const browser = await this.launch();
        const page = await this.setPage(browser, url);

        console.log(new Date(), 'scroll start!');

        const jobListWrapperSelector =
            '.JobList_contentWrapper__QiRRW .List_List__FsLch li';
        await page.waitForSelector(jobListWrapperSelector);

        try {
            await this.autoScroll(page, 2000);
        } catch (err) {
            if (this.retryCount <= this.limitRetryCount) {
                await page.close();
                this.retryCount++;

                return this.getPositionIndexesFromWanted();
            } else {
                throw err;
            }
        }

        const positionIndexList: PositionIndex[] = [];

        const jobCards = await page.$$(jobListWrapperSelector);
        for (const jobCard of jobCards) {
            const positionIndex = await jobCard.$eval('a', (element) => {
                const reg =
                    /프론트|풀스택|시니어|fullstack|frontend|front-end|devops/; // 필터링
                const positionTitle =
                    element.getAttribute('data-position-name');
                console.log('positiontitle', positionTitle);
                if (
                    positionTitle &&
                    !reg.test(positionTitle.toLocaleLowerCase())
                ) {
                    return element.getAttribute('data-position-id');
                }

                return null;
            });

            if (positionIndex !== null) {
                positionIndexList.push(Number(positionIndex));
            }
        }

        console.log(new Date(), 'scroll finish!');

        await browser.close();

        return new Set(positionIndexList);
    }

    async getJobPosting(positionIndex: string): Promise<JobInfo> {
        const url = this.config.url.wanted.default + '/wd/' + positionIndex;
        const browser = await this.launch();
        const page = await this.setPage(browser, url);

        // TODO: nodejs 서울 공고만 조회하도록 되어있음. 배포 후 다른 포지션 추가해야 함
        const position = 'nodejs';
        const location = '서울';

        const jobListWrapperSelector = '.JobContent_descriptionWrapper__SM4UD';
        await page.waitForSelector(jobListWrapperSelector);

        // 상세 정보 더 보기 버튼 있을 경우 클릭해줘야 짤린 정보까지 가져올 수 있음
        await page.$eval(`${jobListWrapperSelector} button`, (element) =>
            element.click()
        );

        await delay(100);

        const info = await page.evaluate(async () => {
            const jobHeader = document.body.querySelector(
                '.JobHeader_JobHeader__Tools__Company__Link__QjFBa'
            );

            const companyName = jobHeader?.getAttribute('data-company-name');
            const positionTitle = jobHeader?.getAttribute('data-position-name');

            const jobDescriptionElements = document.body.querySelectorAll(
                '.JobDescription_JobDescription__paragraph__Iwfqn h3'
            );
            const description: JobDescription = {};

            for (const e of jobDescriptionElements) {
                let category: null | keyof JobDescription = null;

                switch (e.textContent) {
                    case '주요업무':
                        category = 'mainResponsibilities';
                        break;
                    case '자격요건':
                        category = 'qualifications';
                        break;
                    case '우대사항':
                        category = 'preferences';
                        break;
                    case '혜택 및 복지':
                        category = 'welfareBenefits';
                        break;
                    default:
                        break;
                }

                if (category != null) {
                    description[category] =
                        e.nextElementSibling?.querySelector('span')?.innerHTML;
                }
            }

            const mainResponsibilities = description.mainResponsibilities;
            const qualifications = description.qualifications;
            const preferences = description.preferences;
            const welfareBenefits = description.welfareBenefits;
            const address = document.body.querySelector(
                '.JobWorkPlace_JobWorkPlace__map__location__Jksjp span'
            )?.textContent;

            const closingDateText = document.body.querySelector(
                '.JobDueTime_JobDueTime__iKbEO span'
            )?.textContent;
            const closingDate = closingDateText?.startsWith('상시')
                ? null
                : closingDateText;

            return {
                companyName,
                positionTitle,
                companyAddress: address,
                mainResponsibilities: mainResponsibilities || null,
                qualifications: qualifications || null,
                preferences: preferences || null,
                welfareBenefits: welfareBenefits || null,
                closingDate,
            };
        });

        const jobInfo: any = {
            ...info,
            id: Number(positionIndex),
            companyLocation: location,
            positionName: position,
            url,
        };

        await browser.close();

        return jobInfo;
    }

    async scroll(page: Page, height: number): Promise<void> {
        await page.evaluate(async (height) => {
            await new Promise(async (resolve, reject) => {
                let totalHeight = 0;

                window.scrollTo(0, height);
                new Promise((resolve) => setTimeout(resolve, 1000));

                const timer = setInterval(async () => {
                    const scrollHeight = document.body.scrollHeight;
                    if (scrollHeight < height) {
                        reject(new Error('scroll failed'));
                    }

                    console.log(
                        `check - height: ${scrollHeight}, total: ${totalHeight}`
                    );

                    window.scrollBy(0, scrollHeight);

                    if (totalHeight === scrollHeight) {
                        clearInterval(timer);
                        resolve('success');
                    }

                    totalHeight = scrollHeight;
                }, 3000); // scrollBy보다 먼저 실행돼서 3000으로 수정함
            });
        }, height);
    }

    // 비동기 이슈 때문에 최대 3회까지 재실행
    async autoScroll(page: Page, height: number): Promise<void> {
        const MAX_COUNT = 3;
        let retryCount = 0;

        while (retryCount < MAX_COUNT) {
            try {
                await this.scroll(page, height);

                return;
            } catch (err) {
                if (err instanceof Error) {
                    if (err.message.startsWith('scroll failed')) {
                        retryCount++;
                    }
                } else {
                    throw err;
                }
            }

            await delay(2000);
        }

        if (retryCount === MAX_COUNT) {
            throw new Error('Maximum count exceeded');
        }
    }
}
