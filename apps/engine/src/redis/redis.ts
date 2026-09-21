import { createClient, type RedisClientType } from "redis";

// dont accidentally create multiple connections to redis
export class RedisManager {
    private client: RedisClientType;
    private static instance: RedisManager;

    constructor() {
        const redisUrl =
            process.env.REDIS_URL || "redis://localhost:6379";

        this.client = createClient({
            url: redisUrl
        });

        this.client.connect();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new RedisManager();
        }

        return this.instance;
    }

    public async getNextOrder() {
        return await this.client.brPop("messages", 0);
    }

    public async sendResult(clientId: string, payload: any) {
        await this.client.publish(
            clientId,
            JSON.stringify(payload)
        );
    }

    public async pushMessage(message: any) {
        await this.client.lPush(
            "db_processor",
            JSON.stringify(message)
        );
    }
}