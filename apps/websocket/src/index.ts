import WebSocket, { WebSocketServer } from "ws";
import { UserManager } from "./userManager.js";


const wss = new WebSocketServer({ port: 8081 });

wss.on("connection", (ws: WebSocket) => {
    UserManager.getInstance().addUser(ws);
})
