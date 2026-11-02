FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY public ./public
COPY browser ./browser
COPY scripts/build/wallet.mjs ./scripts/build/wallet.mjs
RUN npm run build:wallet && npm prune --omit=dev

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends util-linux gosu && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production HOST=0.0.0.0 DATA_DIR=/data
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY package.json server.mjs ./
COPY lib ./lib
COPY data/metadata-demo ./data/metadata-demo
COPY scripts/runtime ./scripts/runtime
COPY deploy/container-entrypoint.sh ./deploy/container-entrypoint.sh
RUN mkdir /data && chown node:node /data
EXPOSE 4173
CMD ["sh", "deploy/container-entrypoint.sh"]
