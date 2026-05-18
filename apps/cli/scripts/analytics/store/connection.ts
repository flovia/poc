import { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { AnalyticsStoreOptions } from "../store";

const DEFAULT_ANALYTICS_DB_PATH = path.join(process.cwd(), "data", "analytics", "analytics.sqlite");

export const getDefaultAnalyticsDbPath = () => DEFAULT_ANALYTICS_DB_PATH;

export const resolveAnalyticsDbPath = (options: AnalyticsStoreOptions = {}) => {
  if (options.mode === "memory") return ":memory:";
  if (options.mode === "temporary") {
    return path.join(
      fs.mkdtempSync(path.join(process.cwd(), "tmp", "analytics-store-")),
      "analytics.sqlite",
    );
  }
  return options.path ?? process.env.ANALYTICS_DB_PATH ?? DEFAULT_ANALYTICS_DB_PATH;
};

export const openAnalyticsDatabase = (dbPath: string) => {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath, { create: true });
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
};
