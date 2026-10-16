import axios from "axios";
import "dotenv/config";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const MARKET = "SOL_USDC";

const MM_EMAIL = process.env.MARKET_MAKER_EMAIL ?? "marketmaker@cryptolattice.com";
const MM_PASSWORD = process.env.MARKET_MAKER_PASSWORD ?? "MarketMakerPassword123!";

const TICK_MS = Number(process.env.TICK_MS ?? 1500);
const REAL_PRICE_REFRESH_MS = 10_000;
const LADDER_LEVELS = Number(process.env.LADDER_LEVELS ?? 8);
const LADDER_SPREAD_BPS = 20; // 0.20% spread
const LADDER_PER_LEVEL_BPS = 10; // 0.10% distance per level
const STALE_BPS = 60; // cancel orders > 0.60% away from target
const RANDOM_CANCEL_PROBABILITY = Number(process.env.RANDOM_CANCEL_PROBABILITY ?? 0.1);

const MAKER_BASE_QTY = 0.5;
const TAKER_MIN_QTY = 0.05;
const TAKER_MAX_QTY = 0.25;
const PRICE_TICK_SIZE = 0.01;

let authToken: string | null = null;
let currentTargetPrice = 150.0;
let isTicking = false;

interface DepthLevel {
    price: number;
    quantity: number;
}

interface DepthResponse {
    market: string;
    bids?: DepthLevel[];
    asks?: DepthLevel[];
}

interface OpenOrder {
    id: string;
    market: string;
    side: "BUY" | "SELL";
    price: number;
    quantity: number;
    filled: number;
    status: string;
}

function getAuthHeaders() {
    return {
        headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
        },
    };
}

async function authenticate(): Promise<void> {
    console.log(`[MM] Authenticating bot account: ${MM_EMAIL}...`);
    try {
        const signinRes = await axios.post(`${BASE_URL}/api/v1/auth/signin`, {
            email: MM_EMAIL,
            password: MM_PASSWORD,
        });
        if (signinRes.data?.token) {
            authToken = signinRes.data.token;
            console.log("[MM] Logged in successfully.");
            await ensureSufficientBalance();
            return;
        }
    } catch {
        // user may not exist yet, try signup
    }

    try {
        console.log("[MM] Account not found. Creating new market maker account...");
        const signupRes = await axios.post(`${BASE_URL}/api/v1/auth/signup`, {
            email: MM_EMAIL,
            password: MM_PASSWORD,
        });
        if (signupRes.data?.token) {
            authToken = signupRes.data.token;
            console.log("[MM] Account created and authenticated.");
            await ensureSufficientBalance();
            return;
        }
    } catch (err) {
        console.error("[MM] Authentication failed:", (err as Error).message);
    }
}

async function ensureSufficientBalance(): Promise<void> {
    if (!authToken) return;
    try {
        const { data } = await axios.get(`${BASE_URL}/api/v1/balance`, getAuthHeaders());
        const balances = (data.balances ?? []) as { asset: string; available: string }[];
        const solBal = Number(balances.find((b) => b.asset === "SOL")?.available ?? 0);
        const usdcBal = Number(balances.find((b) => b.asset === "USDC")?.available ?? 0);

        console.log(`[MM] Balances: ${solBal.toFixed(2)} SOL | ${usdcBal.toFixed(2)} USDC`);

        if (solBal < 100) {
            console.log("[MM] Depositing initial SOL liquidity...");
            await axios.post(
                `${BASE_URL}/api/v1/balance/deposit`,
                { asset: "SOL", amount: 5000 },
                getAuthHeaders(),
            );
        }
        if (usdcBal < 10000) {
            console.log("[MM] Depositing initial USDC liquidity...");
            await axios.post(
                `${BASE_URL}/api/v1/balance/deposit`,
                { asset: "USDC", amount: 1_000_000 },
                getAuthHeaders(),
            );
        }
    } catch (err) {
        console.error("[MM] Failed to verify/deposit balance:", (err as Error).message);
    }
}

async function fetchLiveSolPrice(): Promise<number> {
    // 1. Try Binance public spot ticker (free, no auth needed)
    try {
        const { data } = await axios.get<{ price: string }>(
            "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDC",
            { timeout: 4000 },
        );
        const p = Number(data.price);
        if (Number.isFinite(p) && p > 0) return p;
    } catch {
        /* fallback to Coinbase */
    }

    // 2. Try Coinbase public spot
    try {
        const { data } = await axios.get<{ data: { amount: string } }>(
            "https://api.coinbase.com/v2/prices/SOL-USD/spot",
            { timeout: 4000 },
        );
        const p = Number(data.data.amount);
        if (Number.isFinite(p) && p > 0) return p;
    } catch {
        /* fallback to internal exchange trade */
    }

    // 3. Try internal recent trades
    try {
        const { data } = await axios.get<{ trades: { price: number }[] }>(
            `${BASE_URL}/api/v1/market/${MARKET}/trades?limit=1`,
            { timeout: 2000 },
        );
        const lastTrade = data.trades?.[0]?.price;
        if (lastTrade && lastTrade > 0) return lastTrade;
    } catch {
        /* fallback */
    }

    return currentTargetPrice || 150.0;
}

async function refreshPrice(): Promise<void> {
    try {
        const livePrice = await fetchLiveSolPrice();
        if (Number.isFinite(livePrice) && livePrice > 0) {
            // Smooth target towards live price
            currentTargetPrice = Number(livePrice.toFixed(2));
            console.log(`[MM] Reference ${MARKET} price: $${currentTargetPrice}`);
        }
    } catch (err) {
        console.error("[MM] refreshPrice error:", (err as Error).message);
    }
}

async function getDepth(): Promise<DepthResponse | null> {
    try {
        const { data } = await axios.get<DepthResponse>(`${BASE_URL}/api/v1/depth/${MARKET}`);
        return data;
    } catch {
        return null;
    }
}

async function getOpenOrders(): Promise<OpenOrder[]> {
    if (!authToken) return [];
    try {
        const { data } = await axios.get<{ orders: OpenOrder[] }>(
            `${BASE_URL}/api/v1/orders`,
            getAuthHeaders(),
        );
        return (data.orders ?? []).filter(
            (o) => (o.status === "OPEN" || o.status === "PARTIALLY_FILLED") && o.market === MARKET,
        );
    } catch {
        return [];
    }
}

async function placeOrder(side: "BUY" | "SELL", price: number, quantity: number): Promise<void> {
    if (!authToken) return;
    try {
        await axios.post(
            `${BASE_URL}/api/v1/orders`,
            {
                market: MARKET,
                side,
                price: Number(price.toFixed(2)),
                quantity: Number(quantity.toFixed(3)),
            },
            getAuthHeaders(),
        );
    } catch {
        // ignored
    }
}

async function cancelOrder(orderId: string): Promise<void> {
    if (!authToken) return;
    try {
        await axios.delete(`${BASE_URL}/api/v1/orders/${encodeURIComponent(orderId)}`, getAuthHeaders());
    } catch {
        // ignored
    }
}

function quantize(price: number): number {
    return Math.round(price / PRICE_TICK_SIZE) * PRICE_TICK_SIZE;
}

async function tickMarket(): Promise<void> {
    if (isTicking || !authToken) return;
    isTicking = true;

    try {
        const target = currentTargetPrice;
        if (!target || target <= 0) return;

        const [depth, openOrders] = await Promise.all([getDepth(), getOpenOrders()]);

        const bids = depth?.bids ?? [];
        const asks = depth?.asks ?? [];
        const bestBid = bids.length ? Math.max(...bids.map((b) => b.price)) : null;
        const bestAsk = asks.length ? Math.min(...asks.map((a) => a.price)) : null;

        const localMid =
            bestBid !== null && bestAsk !== null
                ? (bestBid + bestAsk) / 2
                : (bestBid ?? bestAsk ?? target);

        // 1. Cancel stale / crossing orders
        const staleAbs = (target * STALE_BPS) / 10_000;
        const cancelPromises: Promise<void>[] = [];

        for (const o of openOrders) {
            const p = o.price;
            const tooFar = Math.abs(p - target) > staleAbs;
            const wrongSide =
                (o.side === "BUY" && p >= target) || (o.side === "SELL" && p <= target);
            if (tooFar || wrongSide || Math.random() < RANDOM_CANCEL_PROBABILITY) {
                cancelPromises.push(cancelOrder(o.id));
            }
        }
        await Promise.allSettled(cancelPromises);

        const placePromises: Promise<void>[] = [];

        // 2. Taker churn (executes small trades to produce candles and live trades on UI)
        if (bestBid !== null && bestAsk !== null && Math.random() < 0.4) {
            const takerQty = TAKER_MIN_QTY + Math.random() * (TAKER_MAX_QTY - TAKER_MIN_QTY);
            const side: "BUY" | "SELL" = Math.random() < 0.5 ? "BUY" : "SELL";
            const takerPrice = side === "BUY" ? bestAsk : bestBid;
            placePromises.push(placeOrder(side, takerPrice, takerQty));
        }

        // 3. Maker ladder around target price
        const halfSpread = (target * LADDER_SPREAD_BPS) / 20_000;
        const step = (target * LADDER_PER_LEVEL_BPS) / 10_000;

        for (let i = 1; i <= LADDER_LEVELS; i++) {
            const jitter = 1 + (Math.random() - 0.5) * 0.05;
            const offset = (halfSpread + step * (i - 1)) * jitter;

            const bidPrice = quantize(localMid - offset);
            const askPrice = quantize(localMid + offset);

            if (bidPrice > 0 && askPrice > bidPrice) {
                const qty = MAKER_BASE_QTY * (0.8 + Math.random() * 0.8) * (1 + i * 0.2);
                placePromises.push(placeOrder("BUY", bidPrice, qty));
                placePromises.push(placeOrder("SELL", askPrice, qty));
            }
        }

        await Promise.allSettled(placePromises);
    } catch (err) {
        console.error("[MM] tick error:", (err as Error).message);
    } finally {
        isTicking = false;
    }
}

async function main() {
    console.log(`Starting Solana Market Maker for ${MARKET}...`);
    await authenticate();
    await refreshPrice();

    setInterval(refreshPrice, REAL_PRICE_REFRESH_MS);
    setInterval(tickMarket, TICK_MS);

    // Initial tick
    await tickMarket();
}

main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
