FROM oven/bun:1.3.13

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/cli/package.json apps/cli/package.json
COPY apps/bff/package.json apps/bff/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/intelligence/package.json packages/intelligence/package.json
COPY packages/sources/package.json packages/sources/package.json

RUN bun install --frozen-lockfile

COPY apps/bff ./apps/bff
COPY packages/contracts ./packages/contracts

WORKDIR /app/apps/bff

ENV PORT=3001 \
    DATABASE_URL=/data/flovia.db

RUN mkdir -p /data

VOLUME ["/data"]

EXPOSE 3001

CMD ["bun", "run", "start"]
