FROM node:lts AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-frontend,target=/pnpm/store \
    set -x \
    && pnpm store path \
    && pnpm config set store-dir /pnpm/store \
    && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:lts-slim

WORKDIR /app
COPY --from=build /app/build ./
ENV PORT=3000 HOST=0.0.0.0
CMD ["node", "index.js"]
