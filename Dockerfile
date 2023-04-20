FROM debian:bullseye-slim

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# hadolint ignore=DL3008
RUN apt-get update && \
  apt-get install -y \
  chromium \
  chromium-l10n \
  fonts-liberation \
  fonts-roboto \
  hicolor-icon-theme \
  libcanberra-gtk-module \
  libexif-dev \
  libgl1-mesa-dri \
  libgl1-mesa-glx \
  libpangox-1.0-0 \
  libv4l-0 \
  fonts-symbola \
  xvfb \
  xauth \
  dbus \
  dbus-x11 \
  x11vnc \
  ca-certificates \
  curl \
  gnupg2 \
  dumb-init \
  --no-install-recommends && \
  rm -rf /var/lib/apt/lists/* && \
  curl -sL https://deb.nodesource.com/setup_18.x | bash - && \
  apt-get update && \
  apt-get install -y --no-install-recommends nodejs && \
  curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
  echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
  apt-get update && \
  apt-get install -y --no-install-recommends yarn && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn
COPY src/ src/
COPY tsconfig.json .

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

ENV DISPLAY :99
ENV NODE_ENV production
ENV CONFIG_PATH /data/config.json
ENV NOTIFIED_PATH /data/notified.json
ENV CHROMIUM_PATH /usr/bin/chromium
ENV LOG_DIR /data/logs

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/entrypoint.sh"]
