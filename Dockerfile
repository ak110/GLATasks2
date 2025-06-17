FROM node:lts AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY package.json pnpm-lock.yaml tsconfig.json vite.config.ts /app/
COPY appjs /app/appjs
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    set -x \
    && pnpm store path \
    && pnpm install --frozen-lockfile \
    && pnpm build

FROM python:3.13

# APTのキャッシュ https://github.com/moby/buildkit/blob/master/frontend/dockerfile/docs/reference.md#example-cache-apt-packages
RUN rm -f /etc/apt/apt.conf.d/docker-clean; \
    echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache

ARG DEBIAN_FRONTEND=noninteractive
RUN --mount=type=cache,target=/var/lib/apt/lists \
    --mount=type=cache,target=/var/cache/apt/archives \
    set -x \
    && apt-get update \
    && apt-get install --yes --no-install-recommends \
        locales \
        task-japanese \
    && locale-gen ja_JP.UTF-8 \
    && localedef -f UTF-8 -i ja_JP ja_JP.utf8 \
    && update-locale LANG=ja_JP.UTF-8 LANGUAGE='ja_JP:ja'

# devpi-server用
ARG PIP_TRUSTED_HOST=""
ARG PIP_INDEX_URL=""

RUN --mount=type=cache,target=/root/.cache \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    set -x \
    && pip3 install --no-cache-dir --upgrade pip \
    && pip3 install --no-cache-dir uv \
    && UV_PROJECT_ENVIRONMENT=/usr/local uv sync --frozen --no-group=dev

COPY . /usr/src/app
WORKDIR /usr/src/app

COPY --from=build /app/app/static/dist /usr/src/app/app/static/dist

ARG RUN_UID=1000
RUN useradd --no-create-home --no-user-group --uid=$RUN_UID user
USER user

ENV TZ='Asia/Tokyo' \
    LANG='ja_JP.UTF-8' \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    MPLBACKEND=Agg \
    BETTER_EXCEPTIONS=1

CMD ["hypercorn", "--reload", "--bind=0.0.0.0:8000", "--workers=1", "--error-logfile=-", "asgi:create_app()"]
