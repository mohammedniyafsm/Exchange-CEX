import { createClient, type RedisClientType } from "redis"

export class RedisManager {

    private client: RedisClientType;
    private publisher: RedisClientType;
    private static instance: RedisManager;

    constructor() {
        this.client = createClient({
            url: "redis://redis:6379"
        })
        this.client.connect();

        this.publisher = createClient({
            url: "redis://redis:6379"
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