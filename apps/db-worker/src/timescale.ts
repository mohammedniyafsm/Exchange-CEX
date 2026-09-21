import { Pool } from "pg";

const timescaleUrl = process.env.TIMESCALE_DATABASE_URL;

if (!timescaleUrl) {
    console.warn("TIMESCALE_DATABASE_URL is not set; trade history will not be written to TimescaleDB");
}

const pool = timescaleUrl ? new Pool({ connectionString: timescaleUrl }) : null;

let initialized = false;

async function initializeTimescale() {
    if (!pool || initialized) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS trades (
            time TIMESTAMPTZ NOT NULL,
            trade_id BIGINT NOT NULL,
            market TEXT NOT NULL,
            price NUMERIC NOT NULL,
            quantity NUMERIC NOT NULL,
            quote_quantity NUMERIC NOT NULL,
            buy_order_id TEXT NOT NULL,
            sell_order_id TEXT NOT NULL,
            buy_user_id TEXT NOT NULL,
            sell_user_id TEXT NOT NULL,
            PRIMARY KEY (market, trade_id, time)
        )
    `);

    await pool.query(`
        SELECT create_hypertable('trades', 'time', if_not_exists => TRUE)
    `);

    initialized = true;
}

export async function saveTradeToTimescale(data: {
    tradeId: number;
    market: string;
    price: number;
    quantity: number;
    buyOrderId: string;
    sellOrderId: string;
    buyUserId: string;
    sellUserId: string;
    timestamp: number;
}) {
    if (!pool) return;

    await initializeTimescale();
    await pool.query(
        `
            INSERT INTO trades (
                time, trade_id, market, price, quantity, quote_quantity,
                buy_order_id, sell_order_id, buy_user_id, sell_user_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (market, trade_id) DO NOTHING
        `,
        [
            new Date(data.timestamp),
            data.tradeId,
            data.market,
            data.price,
            data.quantity,
            Number(data.price) * Number(data.quantity),
            data.buyOrderId,
            data.sellOrderId,
            data.buyUserId,
            data.sellUserId,
        ],
    );
}