import { createClient } from 'redis';
import { DBQuery } from './db.js';
import { startCron } from './TimescaleDB/cron.js';
import { timeScaleClient } from './TimescaleDB/timescaleClient.js';


export async function startProcessor() {

    await timeScaleClient.connect();
    console.log("Connected to TimescaleDB");

    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    const redisClient = createClient({
        url: redisUrl
    });
    await redisClient.connect();
    console.log("Connected to Redis");

    startCron();

    while (true) {

        const response = await redisClient.brPop("db_processor", 0);
        if (!response) continue;

        const data: any = JSON.parse(response.element);
        console.log(data);

        await DBQuery(data);
    }
}

startProcessor();
