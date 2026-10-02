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

  //Pub/sub send with clientId and subribe to that clientId event 
  public sendAndWait(message: unknown, timeoutMs = 5_000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.getRandomId();
      let settled = false;
      const timeout = setTimeout(() => fail(new Error("Engine request timed out")), timeoutMs);
      const cleanup = () => {
        clearTimeout(timeout);
        void this.client.unsubscribe(id).catch(() => undefined);
      };
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      void this.client.subscribe(id, (payload: string) => {
        if (settled) return;
        try {
          const response = JSON.parse(payload);
          settled = true;
          cleanup();
          resolve(response);
        } catch (error) {
          fail(error);
        }
      }).then(() => this.publisher.lPush("messages", JSON.stringify({ clientId: id, message })))
        .catch(fail);
    });
  }

  public getRandomId() {
    return uuidv4();
  }
}