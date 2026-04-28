import { createBffDatabaseContext } from "./db/context";
import { createBffHandler } from "./http";
import { createBffReadService } from "./services/read-service";

const port = Number(process.env.PORT ?? "3001");
const databasePath = process.env.DATABASE_URL;
const context = createBffDatabaseContext({ databasePath });
const handler = createBffHandler(createBffReadService(context.database));

Bun.serve({
  port,
  fetch: handler,
});

console.log(`Flovia BFF listening on http://localhost:${port}`);
