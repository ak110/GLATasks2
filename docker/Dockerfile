FROM python:3.13

# APTのキャッシュ https://github.com/moby/buildkit/blob/master/frontend/dockerfile/docs/reference.md#example-cache-apt-packages
RUN rm -f /etc/apt/apt.conf.d/docker-clean; \
    echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache

WORKDIR /usr/src/app

ARG DEBIAN_FRONTEND=noninteractive
RUN --mount=type=cache,target=/var/lib/apt/lists,sharing=private \
    --mount=type=cache,target=/var/cache/apt/archives,sharing=private \
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

COPY /requirements.txt /
RUN --mount=type=cache,target=/root/.cache,sharing=private \
    set -x \
    && pip3 install --no-cache-dir --upgrade pip \
    && pip3 install --no-cache-dir --requirement /requirements.txt

ARG RUN_UID=1000
RUN useradd --no-create-home --no-user-group --uid=$RUN_UID user
USER user

ENV TZ='Asia/Tokyo' \
    LANG='ja_JP.UTF-8' \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    MPLBACKEND=Agg \
    BETTER_EXCEPTIONS=1

CMD ["hypercorn", "--reload", "--bind=0.0.0.0:8000", "--access-log=-", "--error-log=-", "asgi:create_app()"]
