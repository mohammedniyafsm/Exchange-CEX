import { WebSocket } from "ws"
import { subscriptionManager } from "./subscriptionManager.js";

export class User {
    private id: string;
    private ws: WebSocket;
    private subscriptions: string[] = [];


    constructor(id: string, ws: WebSocket) {
        this.id = id;
        this.ws = ws;
        this.ws.on("error", (error) => {
            console.error(`[WS] Socket error for ${this.id}`, error);
        });
        this.addListeners();
    }

    emit(message: any) {
        const serializedMessage = JSON.stringify(message);
        if (this.ws.readyState !== WebSocket.OPEN) {
            console.error(`[WS] Cannot send to ${this.id}; socket state: ${this.ws.readyState}`);
            return;
        }

        try {
            this.ws.send(serializedMessage, (error) => {
                if (error) {
                    console.error(`[WS] Send failed to ${this.id}`, error);
                    return;
                }

                console.log(`[WS] Send completed to ${this.id}`, serializedMessage);
            });
        } catch (error) {
            console.error(`[WS] Send threw for ${this.id}`, error);
        }
    }

    private addListeners() {
        this.ws.on("message", (message: string) => {
            try {
                const parsedMessage = JSON.parse(message.toString());
                if (
                    !["SUBSCRIBE", "UNSUBSCRIBE"].includes(parsedMessage.method) ||
                    !Array.isArray(parsedMessage.params) ||
                    !parsedMessage.params.every((channel: unknown) =>
                        typeof channel === "string" &&
                        /^market:(depth|trades):[A-Z0-9]+_[A-Z0-9]+$/.test(channel)
                    )
                ) {
                    this.emit({ type: "ERROR", message: "Invalid subscription request" });
                    return;
                }

                if (parsedMessage.method === "SUBSCRIBE") {
                    parsedMessage.params.forEach((channel: string) => {
                        subscriptionManager.getInstance().subscribe(this.id, channel);
                    });
                }

                if (parsedMessage.method === "UNSUBSCRIBE") {
                    parsedMessage.params.forEach((channel: string) => {
                        subscriptionManager.getInstance().unSubscribe(this.id, channel);
                    });
                }
            } catch (error) {
                console.error(`[WS] Invalid message from ${this.id}`, error);
                this.emit({ type: "ERROR", message: "Invalid JSON message" });
            }
        })
    }
}