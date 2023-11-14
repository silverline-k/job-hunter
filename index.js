import {exit} from 'node:process';
import axios from 'axios';
import * as cheerio from 'cheerio';

const URL = 'https://www.wanted.co.kr/wdlist/518/895?country=kr&job_sort=job.latest_order&years=-1&locations=all';

async function main() {
    const $ = await axios.get(URL).then(res => {
        return cheerio.load(res.data)('#__next > div.JobList_cn__t_THp > div > div > div.List_List_container__JnQMS > ul');
    });
    
    $.map((i, el) => {
        console.log(el);
    });
    // console.log(cheerio.html($('job-card-company-name')));
}

main()
    .then()
    .catch(err => {
        console.error(err);
        exit(1);
    });