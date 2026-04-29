import { ensureDir, env, initDb, resetDb } from "../../lib/db";

ensureDir(".");

resetDb();
initDb();

console.log(`Reset database at ${env.databasePath}`);
