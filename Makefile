include .env
ifndef COMPOSE_PROFILE
$(error COMPOSE_PROFILEが定義されていません)
endif

RUN_ARGS += --user=$(shell id --user):$(shell id --group) --ulimit="core=0"

export DOCKER_BUILDKIT=1

# pnpm実行用の共通コマンド（プロジェクトルートで実行）
RUN_NODE = docker run $(2) \
    --env=HOME=${PWD}/.cache \
	--env=COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
	--volume=${PWD}:${PWD} \
	--workdir=${PWD} \
	$(RUN_ARGS) \
	node:lts \
	bash -xc '\
	    mkdir -p ${PWD}/.cache/bin &&\
        corepack enable --install-directory ${PWD}/.cache/bin &&\
        export PATH=${PWD}/.cache/bin:${PWD}/node_modules/.bin:$$PATH &&\
		CI=true pnpm install &&\
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
	docker compose --profile $(COMPOSE_PROFILE) pull
ifeq ($(COMPOSE_PROFILE), development)
	docker compose --profile $(COMPOSE_PROFILE) --progress=plain build --pull
endif

start:
	docker compose --profile $(COMPOSE_PROFILE) up -d

stop:
	docker compose --profile $(COMPOSE_PROFILE) down

restart-app:
	docker compose --profile $(COMPOSE_PROFILE) restart app

logs:
	docker compose --profile $(COMPOSE_PROFILE) logs -ft

ps:
	docker compose --profile $(COMPOSE_PROFILE) ps

healthcheck:
	curl --fail http://localhost:3000/healthcheck 2>/dev/null || docker compose --profile $(COMPOSE_PROFILE) exec app curl --fail http://localhost:3000/healthcheck

start-app:
	docker compose --profile $(COMPOSE_PROFILE) down app
	docker compose --profile $(COMPOSE_PROFILE) up -d app

logs-app:
	docker compose --profile $(COMPOSE_PROFILE) logs -ft app

sql:
	docker compose --profile $(COMPOSE_PROFILE) exec db mariadb -uglatasks -pglatasks -Dglatasks

shell:
	docker compose --profile $(COMPOSE_PROFILE) exec app bash

node-shell:
	$(call RUN_NODE, bash, --rm --interactive --tty)

update:
	$(call RUN_NODE, corepack prepare pnpm@latest --activate && corepack use pnpm@latest && pnpm update --latest && pnpm prune && pnpm store prune, --rm)
	$(MAKE) test

format:  # 整形 + 軽量lint（自動修正あり）
	@# pre-commitはフォーマットによるエラーを考慮して2度まで実行
	pre-commit run --all-files || pre-commit run --all-files

test:  # format + check + unit test + e2eテスト
	$(MAKE) format
	$(call RUN_NODE, pnpm run check && pnpm run test:unit, --rm)
	$(MAKE) test-e2e

migrate:  # DBマイグレーション実行
	docker compose exec app node --input-type=module --eval "\
		import { drizzle } from 'drizzle-orm/mysql2';\
		import { migrate } from 'drizzle-orm/mysql2/migrator';\
		import mysql from 'mysql2/promise';\
		const conn = await mysql.createConnection(process.env.DATABASE_URL);\
		const db = drizzle(conn);\
		console.log('🔄 Running migrations...');\
		await migrate(db, { migrationsFolder: './drizzle/migrations' });\
		await conn.end();\
		console.log('✅ Done!');\
	"

db-studio:  # Drizzle Studio起動
	$(call RUN_NODE, pnpm run db:studio, --rm --interactive --tty)

PLAYWRIGHT_IMAGE = mcr.microsoft.com/playwright:v1.50.0-noble

PNPM_VERSION = $(shell node -e "const p=require('./package.json'); console.log((p.packageManager||'').split('@')[1]?.split('+')[0]||'latest')" 2>/dev/null || echo latest)

test-e2e:
	docker compose --profile $(COMPOSE_PROFILE) run --rm \
		--env=BASE_URL=https://web \
		playwright \
		bash -xc '\
			npm install -g pnpm@$(PNPM_VERSION) --prefix ${PWD}/.cache/playwright --force &&\
			export PATH=${PWD}/.cache/playwright/bin:${PWD}/node_modules/.bin:$$PATH &&\
			CI=true pnpm install && pnpm run test:e2e\
		'

.PHONY: help sync deploy build start stop restart-app logs ps healthcheck shell node-shell update format test test-unit test-e2e start-app logs-app migrate db-studio
