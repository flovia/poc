import { createBffHandler } from "./http";

const port = Number(process.env.PORT ?? "3001");
const handler = createBffHandler();

Bun.serve({
  port,
  fetch: handler,
});

console.log(`Flovia BFF listening on http://localhost:${port}`);
