FROM oven/bun:1.3.13

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/cli/package.json apps/cli/package.json
COPY apps/bff/package.json apps/bff/package.json

RUN bun install --frozen-lockfile

COPY apps/cli ./apps/cli

WORKDIR /app/apps/cli

ENV DATABASE_URL=/data/flovia.db \
    REPORTS_DIR=/data/reports \
    FIXTURES_DIR=/app/apps/cli/fixtures \
    MANIFEST_PATH=/app/apps/cli/fixtures/manifest.json \
    RPC_REQUEST_TIMEOUT_MS=30000

RUN mkdir -p /data /data/reports

VOLUME ["/data"]

CMD ["bun", "run", "verify:offline"]
