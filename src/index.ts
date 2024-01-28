import { exit } from 'node:process';
import yaml from 'js-yaml';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import schedule from 'node-schedule';
import Crawler from './crawler';
import { Config } from './types/config';
import DBConnector from './db-connector';
import Repository from './repository';

async function start() {
    console.info('Starting The Job Hunter');

    const config = yaml.load(
        readFileSync(resolve('src', '../config.yml'), 'utf8')
    );

    if (config == null) {
        throw new Error('Configuration not found or undefined.');
    }

    const dbConnector = new DBConnector(config as Config);
    const repository = new Repository(dbConnector.pool);
    const crawler = new Crawler(config as Config, repository);

    try {
        // 매 시간마다 새로운 채용 공고 있을 시 DB에 저장
        schedule.scheduleJob('0 * * * *', async () => {
            console.info(new Date(), 'Job scheduled.');
            await crawler.run();
            console.info(new Date(), 'Job completed.');
        });
    } catch(err) {
        throw err;
    }
}

start()
    .then()
    .catch((err) => {
        console.error(err);
        exit(1);
    });
