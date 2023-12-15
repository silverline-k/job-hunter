import { exit } from 'node:process';
import yaml from 'js-yaml';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import Crawler from './crawler';
import { Config } from './types/config';
import DBConnector from './dbConnector';

async function start() {
    console.info('Starting The Job Hunter');

    const config = yaml.load(
        readFileSync(resolve('src', '../config.yml'), 'utf8')
    );

    if (config == null) {
        // TODO: add error message
        throw new Error();
    }

    const dbConnector = new DBConnector(config as Config);
    const db = dbConnector.createPool();

    const crawler = new Crawler(config as Config, db);

    await crawler.run();
}

start()
    .then()
    .catch((err) => {
        console.error(err);
        exit(1);
    });
