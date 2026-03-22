FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Build context is repo root (see docker-compose): copy backend app + shared `config/game.json`.
COPY backend/package.json backend/package-lock.json* ./
COPY backend/prisma ./prisma

RUN npm install

COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY backend/data ./data
COPY config ./config

RUN npm run db:generate && npm run build

COPY backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 5001

ENTRYPOINT ["/docker-entrypoint.sh"]
