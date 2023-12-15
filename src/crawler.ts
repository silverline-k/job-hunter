import puppeteer, { Page } from 'puppeteer';
import userAgent from 'user-agents';
import { Config } from './types/config';

// TODO: 일단 기존 공고 메모리에 저장. 추후 DB 저장으로 변경
// TODO: 날짜 기준으로 가져올 수 있는지 확인하기, 가능하면 API 추가
export default class Crawler {
    config: Config;
    refresh: boolean;

    constructor(config: Config) {
        this.config = config;
        this.refresh = true;
    }

    async run() {
        // this.init();
        // TODO: scheduler로 변경해야 함
        await this.getWantedJobList();
    }

    // TODO: 데이터 없을 때 해당 페이지 데이터 끝까지 가져오기
    // TODO: 하루에 한 번씩 DB에 저장되어 있는 채용 공고 중 마감인 공고 업데이트하기
    init() {
        this.refresh = true;
    }

    // TODO: 함수명 변경
    // TODO: 1시간에 한 번씩 가져오기
    async getWantedJobList() {
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
            const positionId = await jobCard.$eval('a', (el) =>
                el.getAttribute('data-position-id'),
            );
            const companyName = await jobCard.$eval(
                '.job-card-company-name',
                (el) => el.innerHTML,
            );
            const position = await jobCard.$eval(
                '.job-card-position',
                (el) => el.innerHTML,
            );
            const location = await jobCard.$eval(
                '.job-card-company-location',
                (el) => el.innerHTML,
            );
            const url = await jobCard.$eval('a', (el) => el.href);

            jobList.push({
                id: positionId,
                companyName,
                position,
                location: location.split('<')[0],
                url,
            });
        }

        console.log(new Date(), 'scroll finish!');
        console.log(
            'total:',
            jobList.length,
            ' last data:',
            jobList[jobList.length - 1],
        );

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
                        `check - height: ${scrollHeight}, total: ${totalHeight}`,
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
