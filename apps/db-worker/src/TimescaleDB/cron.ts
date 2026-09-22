import { timeScaleClient } from "./timescaleClient.js";

async function refreshViews() {
	await timeScaleClient.query("REFRESH MATERIALIZED VIEW klines_1m");
	await timeScaleClient.query("REFRESH MATERIALIZED VIEW klines_1h");
	await timeScaleClient.query("REFRESH MATERIALIZED VIEW klines_1w");
	console.log("Materialized views refreshed");
}

export function startCron() {
	refreshViews().catch(console.error);
	setInterval(() => {
		timeScaleClient.query("REFRESH MATERIALIZED VIEW klines_1m").catch(console.error);
	}, 10_000);
	setInterval(() => {
		timeScaleClient.query("REFRESH MATERIALIZED VIEW klines_1h").catch(console.error);
	}, 60_000);
	setInterval(() => {
		timeScaleClient.query("REFRESH MATERIALIZED VIEW klines_1w").catch(console.error);
	}, 60 * 60_000);
	console.log("Timescale candle refresh started");
}

if (process.argv[1]?.endsWith("cron.js")) {
	timeScaleClient.connect().then(startCron).catch(console.error);
}
