import { RedisClientType, createClient } from "redis";
import { UserManager } from "./userManager.js";


export class subscriptionManager {
    private static instance: subscriptionManager;
    private subscriptions: Map<string, string[]> = new Map();
    private reverseSubscriptions: Map<string, string[]> = new Map();
    private redisClient: RedisClientType;

    private constructor() {
        this.redisClient = createClient({
            url: process.env.REDIS_URL,
        });
        this.redisClient.connect();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new subscriptionManager();
            return this.instance;
        }
        return this.instance;
    }

    public subscribe(userId: string, subscription: string) {
        if (this.subscriptions.get(userId)?.includes(subscription)) {
            return;
        }
        this.subscriptions.set(
            userId,
            (this.subscriptions.get(userId) || []).concat(subscription),
        );
        this.reverseSubscriptions.set(
            subscription,
            (this.reverseSubscriptions.get(subscription) || []).concat(userId),
        );
        if (this.reverseSubscriptions.get(subscription)?.length == 1) {
            this.redisClient.subscribe(subscription, this.redisCallbackHandler);
        }
    }

    public unSubscribe(userId: string, subscription: string) {
        const subscriptions = this.subscriptions.get(userId);
        if (subscriptions) {
            this.subscriptions.set(
                userId,
                subscriptions.filter((s) => s !== subscription),
            );
        }

        const reverseSubscriptions = this.reverseSubscriptions.get(subscription);

        if (reverseSubscriptions) {
            this.reverseSubscriptions.set(
                subscription,
                reverseSubscriptions.filter((s) => s !== userId),
            );
            if (this.reverseSubscriptions.get(subscription)?.length == 0) {
                this.reverseSubscriptions.delete(subscription);
                this.redisClient.unsubscribe(subscription);
            }
        }
    }

    private redisCallbackHandler = (message: string, channel: string) => {
        const parsedMessage = JSON.parse(message);
        const subscribers = this.reverseSubscriptions.get(channel) || [];
        console.log("[WS][REDIS] Received", {
            channel,
            subscribers,
            payload: parsedMessage,
        });

        subscribers.forEach((userId) => {
            const user = UserManager.getInstance().getUser(userId);
            if (!user) {
                console.error(`[WS][REDIS] User not found: ${userId}`);
                return;
            }

            user.emit(parsedMessage);
            console.log(`[WS] Forwarded ${channel} to ${userId}`);
        });
    };

    getSubscriptions(userId: string) {
        return this.subscriptions.get(userId) || [];
    }

    public userLeft(userId: string) {
        console.log("user left " + userId);
        this.subscriptions.get(userId)?.forEach((s) => this.unSubscribe(userId, s));
    }


}