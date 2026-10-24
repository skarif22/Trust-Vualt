import "dotenv/config";
import { createApp } from "./app.js";
import { closeDb, connectDb } from "./db.js";
import { migrate } from "./migrate.js";
import { seedIfEmpty } from "./seed.js";

const port = Number(process.env.PORT || 8080);

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "dev-only-trustvault-secret-change-me";
  if (process.env.NODE_ENV === "production") {
    console.error("JWT_SECRET is required in production");
    process.exit(1);
  }
}

const db = await connectDb();
await migrate();
if (process.env.SEED_ON_START !== "false") {
  const result = await seedIfEmpty();
  if (result.seeded) console.log("Seeded demo accounts and documents");
}

const app = createApp();
const server = app.listen(port, () => {
  console.log(`TrustVault listening on :${port} (${db.kind})`);
});

async function shutdown() {
  server.close();
  await closeDb();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
