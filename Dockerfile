FROM node:22-slim AS runner

# hadolint ignore=DL3008
RUN apt-get update && \
  apt-get install -y --no-install-recommends tzdata ca-certificates && \
  cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
  echo "Asia/Tokyo" > /etc/timezone && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json yarn.lock ./

RUN corepack enable && \
  yarn install --frozen-lockfile && \
  yarn cache clean

COPY src/ src/
COPY tsconfig.json .

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

ENV TZ=Asia/Tokyo
ENV NODE_ENV=production
ENV CONFIG_PATH=/data/config.json
ENV NOTIFIED_PATH=/data/notified.json
ENV LOG_DIR=/data/logs/
ENV COOKIE_CACHE_PATH=/data/twitter-cookies.json

ENTRYPOINT ["/app/entrypoint.sh"]
