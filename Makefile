include .env
ifndef COMPOSE_PROFILE
$(error COMPOSE_PROFILEが定義されていません)
endif

RUN_ARGS += --user=$(shell id --user):$(shell id --group) --ulimit="core=0"

export DOCKER_BUILDKIT=1

# pnpm実行用の共通コマンド（app/ ディレクトリで実行）
RUN_NODE = docker run $(2) \
    --env=HOME=${PWD}/.cache \
	--env=COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
	--volume=${PWD}:${PWD} \
	--workdir=${PWD}/app \
	$(RUN_ARGS) \
	node:lts \
	bash -xc '\
	    mkdir -p ${PWD}/.cache/bin &&\
        corepack enable --install-directory ${PWD}/.cache/bin &&\
        export PATH=${PWD}/.cache/bin:${PWD}/app/node_modules/.bin:$$PATH &&\
		$(1)\
	'

help:
	@cat Makefile

sync:  # 最新化＆諸々更新
	docker pull node:lts
	git fetch --prune
	git rebase
	git show --oneline --no-patch
	git status --verbose

deploy:
	$(MAKE) build
	$(MAKE) stop
	$(MAKE) start

build:
	docker compose pull
ifeq ($(COMPOSE_PROFILE), development)
	docker compose --progress=plain build --pull
endif

start:
	docker compose up -d

stop:
	docker compose down

restart-app:
	docker compose restart app

logs:
	docker compose logs -ft

ps:
	docker compose ps

healthcheck:
	curl --fail http://localhost:3000/healthcheck 2>/dev/null || docker compose exec app curl --fail http://localhost:3000/healthcheck

start-app:
	docker compose down app
	docker compose up -d app

logs-app:
	docker compose logs -ft app

sql:
	docker compose exec db mariadb -uglatasks -pglatasks -Dglatasks

shell:
	docker compose exec app bash

node-shell:
	$(call RUN_NODE, bash, --rm --interactive --tty)

update:
	$(call RUN_NODE, corepack prepare pnpm@latest --activate && corepack use pnpm@latest && pnpm update --latest && pnpm prune && pnpm store prune, --rm)
	$(MAKE) test

format:  # 整形 + 軽量lint（自動修正あり）
	pre-commit run --all-files

test:  # format + lint + 型チェック + pre-commit + e2eテスト
	SKIP=pnpm-format pre-commit run --all-files
	$(call RUN_NODE, pnpm run test, --rm)
	$(MAKE) test-e2e

PLAYWRIGHT_IMAGE = mcr.microsoft.com/playwright:v1.50.0-noble

PNPM_VERSION = $(shell node -e "const p=require('./app/package.json'); console.log((p.packageManager||'').split('@')[1]?.split('+')[0]||'latest')" 2>/dev/null || echo latest)

test-e2e:
	docker run --rm --network=host \
		--env=HOME=${PWD}/.cache/playwright \
		--env=BASE_URL=https://localhost:38180 \
		--env=PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
		--volume=${PWD}:${PWD} \
		--workdir=${PWD}/app \
		$(RUN_ARGS) \
		$(PLAYWRIGHT_IMAGE) \
		bash -xc '\
			npm install -g pnpm@$(PNPM_VERSION) --prefix ${PWD}/.cache/playwright --force &&\
			export PATH=${PWD}/.cache/playwright/bin:${PWD}/app/node_modules/.bin:$$PATH &&\
			CI=true pnpm install && pnpm run test:e2e\
		'

.PHONY: help sync deploy build start stop restart-app logs ps healthcheck shell node-shell update format test test-e2e start-app logs-app
