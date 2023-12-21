import schedule from 'node-schedule';

export default class Scheduler {
    constructor() {}

    // async run(cb) {
    //     // TODO: 하루에 한 번씩 DB에 저장되어 있는 채용 공고 중 마감인 공고 업데이트하기
    //     // TODO: 목록에 없으면 삭제. 해야하는데 문제는 오토스크롤 제대로 안 됐을 때 마감 됐다고 생각해서 다 지워버릴수도 있음
    //     schedule.scheduleJob('0 0 * * *', async () => {
    //         await this.init();
    //     });

    //     // 매 시간마다 새로운 채용 공고 있을 시 DB에 저장
    //     schedule.scheduleJob('30 * * * *', async () => {
    //         console.log('now: ', new Date());
    //     });

    //     // TODO: 하루에 한 번씩 전체 공고 가져와서 닫힌 공고 삭제
    // }
}