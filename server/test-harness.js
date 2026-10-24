import { createApp } from "./app.js";
import { connectDb, closeDb, query } from "./db.js";
import { migrate } from "./migrate.js";
import { resetAndSeed } from "./seed.js";

export async function bootTestApp() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-trustvault";
  process.env.SEED_ON_START = "false";
  delete process.env.DATABASE_URL;
  await connectDb();
  await migrate();
  const seed = await resetAndSeed();
  const app = createApp();
  return { app, seed };
}

export async function shutdownTestApp() {
  await closeDb();
}

export { query };
