FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --no-audit --no-fund
COPY server/ ./
RUN npx prisma generate && npm run build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY --from=build --chown=node:node /app/server ./
COPY --from=build --chown=node:node /app/client/dist /app/client/dist
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5001
USER node
EXPOSE 5001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
