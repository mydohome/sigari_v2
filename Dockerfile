# Dockerfile per Sigari Track
FROM node:22-slim AS builder

WORKDIR /app
COPY package*.json .npmrc* ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json .npmrc* ./
RUN npm install --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/data ./data
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/metadata.json ./metadata.json

RUN mkdir -p /app/downloads/backups /app/data

# Installa tsx per eseguire server.ts con TypeScript in Node
RUN npm install -g tsx

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) process.exit(1);})" || exit 1

CMD ["tsx", "server.ts"]
