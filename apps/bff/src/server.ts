import { createBffHandler } from "./http";

const port = Number(process.env.PORT ?? "3001");
const idleTimeout = Number(process.env.BFF_HTTP_IDLE_TIMEOUT_SECONDS ?? "60");
const handler = createBffHandler();

Bun.serve({
  port,
  idleTimeout,
  fetch: handler,
});

console.log(`Flovia BFF listening on http://localhost:${port}`);
