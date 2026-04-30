FROM oven/bun:1.3.13

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/cli/package.json apps/cli/package.json
COPY apps/bff/package.json apps/bff/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/intelligence/package.json packages/intelligence/package.json
COPY packages/sources/package.json packages/sources/package.json

RUN bun install --frozen-lockfile

COPY apps/frontend ./apps/frontend
COPY packages/contracts ./packages/contracts

WORKDIR /app/apps/frontend

ENV BFF_URL=http://bff:3001 \
    NEXT_PUBLIC_BFF_URL=/api \
    NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["bun", "run", "dev", "--", "--hostname", "0.0.0.0"]
