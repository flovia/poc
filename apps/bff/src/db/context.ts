import { createDb, initDb, type AppDatabase } from "../../../cli/lib/db";

export type BffDatabaseContext = {
  database: AppDatabase;
  close: () => void;
};

export type BffDatabaseContextOptions = {
  databasePath?: string;
};

export const createBffDatabaseContext = (
  options: BffDatabaseContextOptions = {},
): BffDatabaseContext => {
  const database = createDb(options.databasePath);
  initDb(database);

  return {
    database,
    close: () => database.close(false),
  };
};
