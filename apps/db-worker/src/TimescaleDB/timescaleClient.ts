import { Client } from "pg";

export const timeScaleClient = new Client({
    ...(process.env.TIMESCALE_DATABASE_URL
        ? { connectionString: process.env.TIMESCALE_DATABASE_URL }
        : {
            user: process.env.TIMESCALE_USER,
            host: process.env.TIMESCALE_HOST,
            database: process.env.TIMESCALE_DATABASE,
            password: process.env.TIMESCALE_PASSWORD,
            port: parseInt(process.env.TIMESCALE_PORT ?? "5433"),
        }),
});


export async function saveTradeToTimescale(data: {
    tradeId: number;
    market: string;
    price: number;
    quantity: number;
    quoteQuantity?: number;
    timestamp: number;
}) {
    await timeScaleClient.query(
        `INSERT INTO trades (time, market, price, quantity, quote_quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [
            new Date(data.timestamp),
            data.market,
            data.price,
            data.quantity,
            data.quoteQuantity ?? Number(data.price) * Number(data.quantity),
        ],
    );
}
