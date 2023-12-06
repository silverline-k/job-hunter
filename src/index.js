import { exit } from 'node:process';
import yaml from 'js-yaml';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import Crawler from './crawler.js';

async function start() {
    console.info('Starting The Job Hunter')

    const config = yaml.load(
        readFileSync(resolve('src', '../config.yml'), 'utf8')
    );

    const crawler = new Crawler(config);

    await crawler.run();
}

start()
    .then()
    .catch((err) => {
        console.error(err);
        exit(1);
    });
