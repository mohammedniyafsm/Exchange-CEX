import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client/index.js";
import { Pool } from "pg";
import { fileURLToPath } from "node:url";

config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
});

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to the environment before starting the app.");
}

const pool = new Pool({
  connectionString,
  max: 15,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  keepAlive: true,
});

pool.on("error", (err: Error) => console.error("Pool error:", err.message));

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
