ARG ALPINE_VERSION=3.16

FROM node:18.9.0-alpine${ALPINE_VERSION} AS builder
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
WORKDIR /build-stage
COPY package*.json ./
RUN npm ci
# Copy the the files you need
COPY . ./
RUN npm run build

FROM alpine:${ALPINE_VERSION}
ENV CHROME_PATH="/usr/bin/chromium-browser"
# Create app directory
WORKDIR /usr/src/app
# Add required binaries
RUN apk add --no-cache libstdc++ dumb-init chromium nss ca-certificates \
    && addgroup -g 1000 node && adduser -u 1000 -G node -s \bin\sh -D node \
    && chown node:node ./
# Update the following COPY lines based on your codebase
COPY --from=builder /usr/local/bin/node /usr/local/bin/
COPY --from=builder /usr/local/bin/docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT [ "docker-entrypoint.sh" ]
USER node
# Update the following COPY lines based on your codebase
COPY --from=builder /build-stage/node_modules ./node_modules
COPY --from=builder /build-stage/dist ./dist
# Run with dumb-init to not start node with PID=1, since Node.js was not designed to run as PID 1
CMD ["dumb-init", "node", "dist/index.js"]
