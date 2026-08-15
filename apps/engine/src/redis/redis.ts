import { createClient, type RedisClientType } from "redis"

export class RedisManager {

    private client: RedisClientType;
    private publisher: RedisClientType;
    private static instance: RedisManager;

    constructor() {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        this.client = createClient({
            url: redisUrl
        })
        this.client.connect();

        this.publisher = createClient({
            url: redisUrl
        })
        this.publisher.connect();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new RedisManager();
            return this.instance
        }
        return this.instance;
    }

    public async getNextOrder() {
        const result = await this.client.brPop("messages", 0);
        return result; 
    }

    public async sendResult(clientId: string, payload: any) {
        await this.publisher.publish(clientId, JSON.stringify(payload));
    }


}