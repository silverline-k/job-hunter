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

        const jobList = await Promise.all(await this.getWantedJobList());
        const newJobsCount = await this.repository.addJobPosting(jobList);

        console.log(`init: ${newJobsCount} job postings have been added.`);
    }

    /**
     * position index 비교 로직 (최근 20개 내림차순으로 가져오는 경우)
     * - db index가 더 클 경우 저장 X
     * - wanted index가 더 큰 경우 db index보다 큰 것만 저장
     * - 20개 전체가 다 클 경우 스크롤 한 번 더 해서 다시 비교 (재귀 함수 사용해야 할 듯)
     */
    async run() {
        const lastPositionIndex = await this.repository.getLastPositionIndex(); // 무조건 있음
        const jobList = await Promise.all(
            await this.getWantedJobList(lastPositionIndex)
        );
        const newJobsCount = await this.repository.addJobPosting(jobList);

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

        return page;
    }

    // TODO: 함수명 변경
    // TODO: 1시간에 한 번씩 가져오기
    async getWantedJobList(lastPositionIndex?: number): Promise<JobList> {
        this.refresh = true; // REMOVE

        const browser = await this.launch();
        const page = await this.setPage(browser);

        console.log(new Date(), 'scroll start!');

        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 서버 시작했을 때, 하루에 한 번 전체 채용 공고 가져올 때만 실행됨
        if (this.refresh) {
            await this.autoScroll(page);
        }

        const jobListWrapperSelector = '.JobList_contentWrapper__QiRRW';
        await page.waitForSelector(jobListWrapperSelector);

        const jobList = [];
        const jobCards = await page.$$(
            `${jobListWrapperSelector} .List_List__FsLch li`
        );

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
                    throw new Error();
                }

                // if (!this.refresh && lastPositionIndex) {
                //     // TODO: 재귀함수 처리
                // } else {
                //     continue;
                // }

                return {
                    id,
                    companyName,
                    positionTitle,
                    location,
                    url,
                };
            });

            jobList.push(jobInfo);
        }
        console.log('total count:', jobList.length);
        console.log(new Date(), 'scroll finish!');

        await browser.close();
        this.refresh = false;

        return jobList as JobList;
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
