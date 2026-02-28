FROM node:lts AS builder
RUN corepack enable
WORKDIR /build
COPY app/package.json app/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY app/ .
RUN pnpm run build && pnpm prune --prod

FROM node:lts-slim
ENV NODE_ENV=production TZ=Asia/Tokyo
WORKDIR /app
COPY --from=builder /build/build ./build
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package.json ./
USER 1000
CMD ["node", "build"]
