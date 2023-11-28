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
        for (const jobCards of jobCardHandle) {
            const companyName = await jobCards.$eval(
                '.job-card-company-name',
                (el) => el.innerHTML
            );
            const position = await jobCards.$eval(
                '.job-card-position',
                (el) => el.innerHTML
            );
            const location = await jobCards.$eval(
                '.job-card-company-location',
                (el) => el.innerHTML
            );

            arr.push({
                companyName,
                position,
                location: location.split('<')[0],
            });
        }

        await browser.close();
    }
}
