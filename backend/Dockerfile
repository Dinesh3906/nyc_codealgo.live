# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
COPY certs ./certs
RUN npm run build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=5000
WORKDIR /app

RUN groupadd --system permitiq && useradd --system --gid permitiq --home-dir /app permitiq

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/certs ./certs
COPY src/config ./src/config
COPY src/data ./src/data
RUN if [ ! -f certs/ca-bundle.pem ] && [ -f certs/global-bundle.pem ]; then cp certs/global-bundle.pem certs/ca-bundle.pem; fi

RUN mkdir -p uploads scratch && chown -R permitiq:permitiq /app
USER permitiq

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
