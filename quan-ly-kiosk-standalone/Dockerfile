# ---- Build stage: install deps + build frontend ----
FROM oven/bun:1.3 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build:client

# ---- Runtime stage: bun server + SQLite ----
FROM oven/bun:1.3
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/server ./server
COPY --from=build /app/drizzle ./drizzle
VOLUME /data
EXPOSE 3000
CMD ["bun", "server/src/index.ts"]
