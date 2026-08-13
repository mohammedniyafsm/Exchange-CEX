import { createClient, RedisClientType } from "redis";
import { v4 as uuidv4 } from 'uuid';

export class RedisManager {
    private publisher: RedisClientType;
    private client: RedisClientType;
    private static instance: RedisManager;

    private constructor() {
        this.client = createClient({ url: "redis://localhost:6379" });
        this.client.connect();

        this.publisher = createClient({ url: "redis://localhost:6379" });
        this.publisher.connect();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new RedisManager();
        }
        return this.instance;
    }

    public sendAndWait(message: any) {
        return new Promise((resolve) => {
            const id = uuidv4();
            this.client.subscribe(id, (msg) => {
                this.client.unsubscribe(id);
                resolve(JSON.parse(msg));
            });
            this.publisher.lPush("messages", JSON.stringify({ clientId: id, message }));
        });
    }
}