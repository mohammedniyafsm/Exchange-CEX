import { createClient } from 'redis';



export async function startProcessor() {
    const redisClient = createClient({
        url: "redis://redis:6379"
    });
    await redisClient.connect();

    console.log("Connected to Redis and postgres");

    while (true) {

        const response = await redisClient.rPop("db_processor");
        if (!response) continue;

        const data: any = JSON.parse(response);
        console.log(data);
        if (data.type == "TRADE_ADDED") {
            const price = data.data.price;
            const timestamp = new Date(data.data.timestamp);
            const volume = data.data.quantity;
            console.log("added ");
        }
    }
}

startProcessor();
