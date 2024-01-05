import puppeteer, { Page, Browser } from 'puppeteer';
import userAgent from 'user-agents';
import { Config } from './types/config';
import { JobList } from './types/index';
import Repository from './repository';

export default class Crawler {
    config: Config;
    repository: Repository;
    refresh: boolean;

    constructor(config: Config, repository: Repository) {
        this.config = config;
        this.repository = repository;
        this.refresh = false;
    }

    async init() {
        this.refresh = true;
        let newJobsCount = 0;

        const jobList = await Promise.all(await this.getJobListFromWanted());
        if (jobList.length > 0) {
            newJobsCount = await this.repository.addJobPosting(jobList);
        }

        console.log(`init: ${newJobsCount} job postings have been added.`);
    }

    /**
     * position index 비교 로직 (최근 20개 내림차순으로 가져오는 경우)
     * - db index가 더 클 경우 저장 X
     * - wanted index가 더 큰 경우 db index보다 큰 것만 저장
     * - 20개 전체가 다 클 경우 스크롤 한 번 더 해서 다시 비교 (재귀 함수 사용해야 할 듯)
     */
    async run() {
        let newJobsCount = 0;
        const lastPositionIndex = await this.repository.getLastPositionIndex();
        const jobList = await Promise.all(
            await this.getJobListFromWanted(lastPositionIndex)
        );

        if (jobList.length > 0) {
            newJobsCount = await this.repository.addJobPosting(jobList);
        }

        console.log(`run: ${newJobsCount} job postings have been added.`);
    }

    async launch(): Promise<Browser> {
        // Launch the browser and open a new blank pave
        const browser = await puppeteer.launch({
            headless: 'new',
            ignoreHTTPSErrors:
                this.config.mode === 'development' ? true : false,
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

    async getJobCardsFromWanted(page: Page, element: string, lastPositionIndex?: number) {
        await page.waitForSelector(element);

        const jobList = [];
        const jobCards = await page.$$(element);

        // TODO: 재귀함수 사용하면 jobList 초기화 돼서 리턴하기 때문에 클로저 사용해야 할 듯

        for (const jobCard of jobCards) {
            const jobInfo = await jobCard.$eval(
                'a',
                (el, lastPositionIndex, refresh) => {
                    const id = el.getAttribute('data-position-id');
                    const companyName = el.getAttribute('data-company-name');
                    const positionTitle = el.getAttribute('data-position-name');
                    const location = ''; // TODO: 태그에서 지역 속성 사라졌음, 어디에서 가져올지 정해야함
                    const url = el.href;

                    if (
                        [
                            id,
                            companyName,
                            positionTitle,
                            location,
                            url,
                        ].includes(null)
                    ) {
                        // TODO: add error message
                        throw new Error();
                    }

                    if (!refresh) {
                        const isNewPosting =
                            lastPositionIndex && lastPositionIndex < Number(id);
                        if (!isNewPosting) {
                            return null;
                        }
                    }

                    return {
                        id,
                        companyName,
                        positionTitle,
                        location,
                        url,
                    };
                },
                lastPositionIndex,
                this.refresh
            );

            if (jobInfo !== null) {
                jobList.push(jobInfo);
            }
        }

        if (!this.refresh && jobCards.length === jobList.length) {
            this.autoScroll(page);

            await new Promise((resolve) => setTimeout(resolve, 2000));

            this.getJobCardsFromWanted(page, element, lastPositionIndex);
        }

        return jobList;
    }

    // TODO: 1시간에 한 번씩 가져오기
    async getJobListFromWanted(lastPositionIndex?: number): Promise<JobList> {
        const browser = await this.launch();
        const page = await this.setPage(browser);

        console.log(new Date(), 'scroll start!');

        await new Promise((resolve) => setTimeout(resolve, 3000));

        const jobListWrapperSelector =
        '.JobList_contentWrapper__QiRRW .List_List__FsLch li';
        await page.waitForSelector(jobListWrapperSelector);

        // 서버 시작했을 때, 하루에 한 번 전체 채용 공고 가져올 때만 실행됨
        if (this.refresh) {
            await this.autoScroll(page);
        }

        const jobList = await this.getJobCardsFromWanted(page, jobListWrapperSelector, lastPositionIndex);

        console.log(new Date(), 'scroll finish!');

        // TODO: close 하기 전에 스크롤 한 번 내리고 가져와야함
        await browser.close();
        this.refresh = false;

        return jobList as JobList;
    }

    // 가져올 수 있는 데이터 다 가져오기
    // TODO: 가끔 전체 데이터 안 가져오는 버그 있음
    async autoScroll(page: Page) {
        await page.evaluate(async (refresh) => {
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

                    if (refresh) {
                        if (totalHeight === scrollHeight) {
                            console.log('check(init) - height:', scrollHeight);

                            if (tryCount === 2) {
                                clearInterval(timer);
                                resolve(true);
                            }

                            tryCount++;
                            console.log('check - try count', tryCount);
                        }

                        totalHeight = scrollHeight;
                    } else {
                        console.log('check(run) - height:', scrollHeight);
                        clearInterval(timer);
                        resolve(true);
                    }
                }, 3000); // 1000으로 했더니 scrollTo보다 먼저 resolve해버려서 3000으로 수정함
            });
        }, this.refresh);
    }
}
