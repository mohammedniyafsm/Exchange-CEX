import { createClient } from 'redis';
import { DBQuery } from './db.js';


export async function startProcessor() {
    
    const redisClient = createClient({
        url: "redis://redis:6379"
    });
    await redisClient.connect();

    console.log("Connected to Redis and postgres");

    while (true) {

        const response = await redisClient.brPop("db_processor", 0);
        if (!response) continue;

        const data: any = JSON.parse(response.element);
        console.log(data);

        DBQuery(data);
    }
}

startProcessor();
