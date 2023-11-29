import puppeteer from 'puppeteer';
import userAgent from 'user-agents';

export default class Crawler {
    constructor(config) {
        this.config = config;
    }

    async run() {
        // TODO: scheduler로 변경해야 함
        await this.getWantedJobList();
    }

    // TODO: 함수명 변경
    async getWantedJobList() {
        // Launch the browser and open a new blank page
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();

        // user agent 설정 안하면 403 뜸
        await page.setUserAgent(userAgent.random().toString());
        await page.goto(this.config.url.wanted);

        const jobListHandle = await page.$('[data-cy="job-list"]');
        const jobCardHandle = await jobListHandle.$$('[data-cy="job-card"]');

        const arr = [];
        for (const jobCard of jobCardHandle) {
            const positionId = await jobCard.$eval('a', (el) => el.getAttribute('data-position-id'));
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

            arr.push({
                id: positionId,
                companyName,
                position,
                location: location.split('<')[0],
                url,
            });
        }

        await browser.close();
    }
}
