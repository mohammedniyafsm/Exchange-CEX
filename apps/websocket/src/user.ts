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
            const parsedMessage = JSON.parse(message);

            if (parsedMessage.method === "SUBSCRIBE") {
                parsedMessage.params.forEach((s: string) => {
                    console.log(`[WS] ${this.id} subscribed: ${s}`);
                    subscriptionManager.getInstance().subscribe(this.id, s)
                })
            }

            if (parsedMessage.method == "UNSUBSCRIBE") {
                parsedMessage.params.forEach((s: any) =>
                    {
                        console.log(`[WS] ${this.id} unsubscribed: ${s}`);
                        subscriptionManager.getInstance().unSubscribe(this.id, s);
                    },
                );
            }

        })
    }
}