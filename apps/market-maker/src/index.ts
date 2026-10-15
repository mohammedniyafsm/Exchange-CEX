import axios from "axios";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const USER_ID = process.env.MARKET_MAKER_USER_ID ?? "5";

const TICK_MS = Number(process.env.TICK_MS ?? 450);
const REAL_PRICE_REFRESH_MS = 15_000;
const RAMP_WINDOW_MS = 60_000;
const LADDER_LEVELS = Number(process.env.LADDER_LEVELS ?? 10);
const LADDER_SPREAD_BPS = 25;
const LADDER_PER_LEVEL_MAX_BPS = Number(
    process.env.LADDER_PER_LEVEL_MAX_BPS ?? 0.1,
);
const STALE_BPS = 60;
const RANDOM_CANCEL_PROBABILITY = Number(
    process.env.RANDOM_CANCEL_PROBABILITY ?? 0.05,
);
const TAKER_MAX_QTY = 0.5;
const TAKER_MIN_QTY = 0.05;
const MAKER_QTY = 1;
const MARKET_TICK_OVERRIDES = process.env.MARKET_TICK_OVERRIDES;
const PRICE_TICK_SIZE = Number(process.env.PRICE_TICK_SIZE ?? 0.01);

// 2-minute Backpack depth.200ms sample (May 2026). Used as defaults.
const OBSERVED_CADENCE_MS: Record<string, number> = {
    BTC_USDC: 391,
    ETH_USDC: 335,
    SOL_USDC: 367,
    XRP_USDC: 401,
    BNB_USDC: 740,
    DOGE_USDC: 514,
    LINK_USDC: 1749,
    ADA_USDC: 500,
    AVAX_USDC: 500,
    TON_USDC: 500,
};

interface Ticker {
    symbol: string;
    lastPrice: string | null;
}

interface Depth {
    bids: [string, string][];
    asks: [string, string][];
}

interface OpenOrder {
    orderId: string;
    side: "buy" | "sell";
    price: number | string;
    market: string;
}

const realPrices = new Map<string, number>();
const targetSnapshots = new Map<
    string,
    { from: number; to: number; startedAt: number }
>();

const DEFAULT_PRICE = 100;

async function fetchTickers(): Promise<Ticker[]> {
    const { data } = await axios.get<Ticker[]>(`${BASE_URL}/api/v1/tickers`);
    return data;
}

function counterpart(sym: string) {
    return sym.endsWith("_PERP") ? sym.slice(0, -"_PERP".length) : `${sym}_PERP`;
}

async function refreshRealPrices() {
    try {
        const tickers = await fetchTickers();
        const priceMap = new Map<string, number>();
        for (const t of tickers) {
            const v = Number(t.lastPrice);
            if (Number.isFinite(v) && v > 0) priceMap.set(t.symbol, v);
        }
        const now = Date.now();
        for (const t of tickers) {
            const direct = priceMap.get(t.symbol);
            const fallback = priceMap.get(counterpart(t.symbol));
            const real = direct ?? fallback ?? DEFAULT_PRICE;
            const prev = realPrices.get(t.symbol);
            realPrices.set(t.symbol, real);
            if (prev === undefined) {
                targetSnapshots.set(t.symbol, { from: real, to: real, startedAt: now });
            } else {
                const snap = targetSnapshots.get(t.symbol);
                const fromPrice = snap ? rampedPrice(snap, now) : prev;
                targetSnapshots.set(t.symbol, {
                    from: fromPrice,
                    to: real,
                    startedAt: now,
                });
            }
        }
    } catch (err) {
        console.error("refreshRealPrices error:", (err as Error).message);
    }
}

function rampedPrice(
    snap: { from: number; to: number; startedAt: number },
    now: number,
) {
    const t = Math.min(1, (now - snap.startedAt) / RAMP_WINDOW_MS);
    return snap.from + (snap.to - snap.from) * t;
}

function targetFor(symbol: string): number | null {
    const snap = targetSnapshots.get(symbol);
    if (!snap) return null;
    return rampedPrice(snap, Date.now());
}

async function getDepth(market: string): Promise<Depth | null> {
    try {
        const { data } = await axios.get<Depth>(
            `${BASE_URL}/api/v1/depth?symbol=${market}`,
        );
        return data;
    } catch {
        return null;
    }
}

async function getOpenOrders(market: string): Promise<OpenOrder[]> {
    try {
        const { data } = await axios.get<OpenOrder[]>(
            `${BASE_URL}/api/v1/order/open?userId=${USER_ID}&market=${market}`,
        );
        return data;
    } catch {
        return [];
    }
}

function fmtPrice(p: number) {
    return p.toFixed(2);
}

function fmtQty(q: number) {
    return q.toFixed(3);
}

function quantizeToTick(price: number): number {
    const ticks = Math.round(price / PRICE_TICK_SIZE);
    return ticks * PRICE_TICK_SIZE;
}

async function placeOrder(
    market: string,
    side: "buy" | "sell",
    price: number,
    quantity: number,
) {
    try {
        await axios.post(`${BASE_URL}/api/v1/order`, {
            market,
            price: fmtPrice(price),
            quantity: fmtQty(quantity),
            side,
            userId: USER_ID,
        });
    } catch {
        /* engine may reject — ignore */
    }
}

async function cancelOrder(market: string, orderId: string) {
    try {
        await axios.delete(`${BASE_URL}/api/v1/order`, {
            data: { orderId, market },
        });
    } catch {
        /* ignore */
    }
}

function bestBidAsk(depth: Depth | null): {
    bid: number | null;
    ask: number | null;
} {
    if (!depth) return { bid: null, ask: null };
    let bid: number | null = null;
    let ask: number | null = null;
    for (const [p] of depth.bids) {
        const v = Number(p);
        if (bid === null || v > bid) bid = v;
    }
    for (const [p] of depth.asks) {
        const v = Number(p);
        if (ask === null || v < ask) ask = v;
    }
    return { bid, ask };
}

async function tickMarket(market: string) {
    const target = targetFor(market);
    if (!target || target <= 0) return;

    const [depth, openOrders] = await Promise.all([
        getDepth(market),
        getOpenOrders(market),
    ]);

    const { bid, ask } = bestBidAsk(depth);
    const localMid =
        bid !== null && ask !== null ? (bid + ask) / 2 : (bid ?? ask ?? target);
    const ladderCenter =
        bid !== null && ask !== null ? localMid : localMid * 0.7 + target * 0.3;

    const staleAbs = (target * STALE_BPS) / 10_000;
    const cancels: Promise<void>[] = [];
    for (const o of openOrders) {
        const p = Number(o.price);
        const tooFar = Math.abs(p - target) > staleAbs;
        const wrongSide =
            (o.side === "buy" && p >= target) || (o.side === "sell" && p <= target);
        if (tooFar || wrongSide || Math.random() < RANDOM_CANCEL_PROBABILITY) {
            cancels.push(cancelOrder(market, o.orderId));
        }
    }

    const places: Promise<void>[] = [];

    // taker push toward target — causes trades + price move
    const diff = target - localMid;
    const driftBps = (Math.abs(diff) / target) * 10_000;
    if (driftBps > 2 && bid !== null && ask !== null) {
        const qty = TAKER_MIN_QTY + Math.random() * (TAKER_MAX_QTY - TAKER_MIN_QTY);
        if (diff > 0) {
            // need to push up — buy at ask
            places.push(placeOrder(market, "buy", ask * 1.0005, qty));
        } else {
            places.push(placeOrder(market, "sell", bid * 0.9995, qty));
        }
    } else {
        // even at target — random taker churn for volatility
        if (bid !== null && ask !== null && Math.random() < 0.5) {
            const qty = TAKER_MIN_QTY + Math.random() * 0.15;
            const side: "buy" | "sell" = Math.random() < 0.5 ? "buy" : "sell";
            const price = side === "buy" ? ask : bid;
            places.push(placeOrder(market, side, price, qty));
        }
    }

    // refresh maker ladder around target
    const spread = (target * LADDER_SPREAD_BPS) / 10_000;
    const rawStep = spread / LADDER_LEVELS;
    const maxPerLevelStep = (ladderCenter * LADDER_PER_LEVEL_MAX_BPS) / 10_000;
    const step = Math.max(
        PRICE_TICK_SIZE,
        Math.min(rawStep, Math.max(maxPerLevelStep, PRICE_TICK_SIZE)),
    );
    for (let i = 1; i <= LADDER_LEVELS; i++) {
        const perLevelJitter = 1 + (Math.random() - 0.5) * 0.08;
        const offset = step * i * perLevelJitter;
        const bidPrice = quantizeToTick(ladderCenter - offset);
        const askPrice = quantizeToTick(ladderCenter + offset);
        if (bidPrice <= 0 || askPrice <= 0 || bidPrice >= askPrice) continue;
        const qty = MAKER_QTY * (0.5 + Math.random());
        places.push(placeOrder(market, "buy", bidPrice, qty));
        places.push(placeOrder(market, "sell", askPrice, qty));
    }

    await Promise.allSettled([...cancels, ...places]);
}

function parseTickOverrides(raw: string | undefined): Record<string, number> {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const out: Record<string, number> = {};
        for (const [market, value] of Object.entries(parsed)) {
            const ms = Number(value);
            if (Number.isFinite(ms) && ms > 0) out[market] = ms;
        }
        return out;
    } catch {
        return {};
    }
}

function marketTickMs(
    market: string,
    overrides: Record<string, number>,
    defaultMs: number,
): number {
    const fromOverride = overrides[market];
    if (fromOverride) return fromOverride;
    return OBSERVED_CADENCE_MS[market] ?? defaultMs;
}

function startMarketLoop(
    market: string,
    baseTickMs: number,
    initialDelayMs = 0,
) {
    const run = async () => {
        try {
            await tickMarket(market);
        } catch (err) {
            console.error(`tick ${market}:`, (err as Error).message);
        }
        const jitter = Math.floor(baseTickMs * 0.12 * Math.random());
        setTimeout(run, baseTickMs + jitter);
    };
    setTimeout(run, initialDelayMs);
}

async function main() {
    await new Promise((r) => setTimeout(r, 5000));
    await refreshRealPrices();
    setInterval(refreshRealPrices, REAL_PRICE_REFRESH_MS);

    const markets = Array.from(realPrices.keys());
    const tickOverrides = parseTickOverrides(MARKET_TICK_OVERRIDES);
    console.log(`market-maker starting on ${markets.length} markets`);
    for (let i = 0; i < markets.length; i++) {
        const market = markets[i]!;
        const tickMs = marketTickMs(market, tickOverrides, TICK_MS);
        const initialDelayMs = i * 40;
        console.log(`loop ${market} every ~${tickMs}ms`);
        startMarketLoop(market, tickMs, initialDelayMs);
    }
}

main().catch((err) => {
    console.error("fatal:", err);
    process.exit(1);
});
