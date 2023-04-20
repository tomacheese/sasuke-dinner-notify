FROM node:19-alpine as builder

WORKDIR /app

COPY package.json .
COPY yarn.lock .

RUN echo network-timeout 600000 > .yarnrc && \
  yarn install --frozen-lockfile && \
  yarn cache clean

COPY src src
COPY tsconfig.json .

RUN yarn package

FROM alpine:edge as runner

# hadolint ignore=DL3018
RUN apk update && \
  apk add --no-cache dumb-init && \
  apk add --no-cache curl fontconfig font-noto-cjk && \
  fc-cache -fv && \
  apk add --no-cache \
  chromium \
  nss \
  freetype \
  freetype-dev \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  nodejs \
  yarn \
  xvfb \
  xauth \
  dbus \
  dbus-x11 \
  x11vnc \
  && \
  apk add --update --no-cache tzdata && \
  cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
  echo "Asia/Tokyo" > /etc/timezone && \
  apk del tzdata

WORKDIR /app

COPY --from=builder /app/output .

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

ENV DISPLAY :99
ENV NODE_ENV production
ENV CONFIG_PATH /data/config.json
ENV NOTIFIED_PATH /data/notified.json
ENV CHROMIUM_PATH /usr/bin/chromium-browser
ENV LOG_DIR /data/logs

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/entrypoint.sh"]
