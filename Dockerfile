FROM node:lts AS builder
RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile
COPY app/ ./app/
COPY tsconfig.json ./
RUN pnpm run build && pnpm prune --prod

FROM node:lts-slim
ENV NODE_ENV=production TZ=Asia/Tokyo
WORKDIR /app
COPY --from=builder /workspace/app/build ./build
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/package.json ./
USER 1000
CMD ["node", "build"]
