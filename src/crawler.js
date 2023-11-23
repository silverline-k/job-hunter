import puppeteer from 'puppeteer';

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
        // 새로운 브라우저 열기
        const browser = await puppeteer.launch({
            headless: 'new',
        });
        const page = await browser.newPage();

        const wantedUrl = this.config.url.wanted;

        console.log(wantedUrl);
        await page.goto(wantedUrl);

        // 페이지가 로드될 때까지 대기
        await page.waitForNavigation();
        // await page.waitForSelector('[data-cy="job-list"]', {timeout: 1000});

        const jobList = await page.$('[data-cy="job-list"]');
        if (jobList) {
            const jobs = [];
            const jobItems = await jobList.$$('li');

            for (const item of jobItems) {
                const jobCard = await item.$('[data-cy="job-card"]');
                console.log('job-card', jobCard);
            }
        } else {
            console.error('해당 요소를 찾을 수 없습니다.');
        }

        console.log('job list', jobList);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        await browser.close();
    }
}
