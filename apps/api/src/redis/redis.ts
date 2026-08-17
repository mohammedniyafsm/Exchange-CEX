import { createClient, type RedisClientType } from "redis";
import { v4 as uuidv4 } from "uuid";

export class RedisManager {
  private publisher: RedisClientType;
  private client: RedisClientType;
  private static instance: RedisManager;

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.client = createClient({
      url: redisUrl,
    });
    this.client.connect();
    this.publisher = createClient({
      url: redisUrl,
    });
    this.publisher.connect();
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new RedisManager();
      return this.instance;
    }
    return this.instance;
  }

  public sendAndWait(message: unknown) {
    return new Promise((resolve) => {
      const id = this.getRandomId();
      this.client.subscribe(id, (payload: string) => {
        this.client.unsubscribe(id);
        resolve(JSON.parse(payload));
      });
      this.publisher.lPush("messages", JSON.stringify({ clientId: id, message }));
    });
  }

  public getRandomId() {
    return uuidv4();
  }
}