import { ensureDir, initDb, resetDb, env } from "../../lib/db";

ensureDir(".");

resetDb();
initDb();

console.log(`Reset database at ${env.databasePath}`);
