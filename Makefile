include .env
ifndef COMPOSE_PROFILE
$(error COMPOSE_PROFILEが定義されていません)
endif

RUN_ARGS += --user=$(shell id --user):$(shell id --group) --ulimit="core=0"

export DOCKER_BUILDKIT=1
export BETTER_EXCEPTIONS=1

# pnpm実行用の共通コマンド
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
		$(1)\
	'

help:
	@cat Makefile

sync:  # 最新化＆諸々更新
	docker pull node:lts
	git fetch --prune
	git rebase
	# git submodule update --init --recursive
	git show --oneline --no-patch
	git status --verbose

deploy:
	$(MAKE) build
	$(MAKE) db-up
	$(MAKE) stop
	$(MAKE) start

build:
	docker compose pull
ifeq ($(COMPOSE_PROFILE), development)
	docker compose --progress=plain build --pull
else
	@# NGINX用にコピー
	docker compose cp app:/usr/src/app/app/static/dist app/static/
endif

start:
	docker compose up -d

stop:
	docker compose down

db-up:
	docker compose run --rm app alembic upgrade head

db-down:
	docker compose run --rm app alembic downgrade -1

db-history:
	docker compose run --rm app alembic history

hup:
	docker compose kill -s HUP

restart-app:
	docker compose restart app

logs:
	docker compose logs -ft

ps:
	docker compose ps

healthcheck:
	docker compose exec app curl --fail http://localhost:8000/healthcheck

start-devserver:
	docker compose down devserver
	docker compose up -d devserver

logs-devserver:
	docker compose logs -ft devserver

sql:
	docker compose exec db mariadb -uglatasks -pglatasks -Dglatasks

shell:
	docker compose exec app bash

node-shell:
	$(call RUN_NODE, bash, --rm --interactive --tty)

update:
	$(MAKE) update-ts
	$(MAKE) update-py
	$(MAKE) test

update-ts:
	$(call RUN_NODE, corepack prepare pnpm@latest --activate && corepack use pnpm@latest && pnpm run clean-update, --rm)

update-py:
	uv sync --upgrade
	uv run pre-commit autoupdate

format:
	$(MAKE) format-ts
	$(MAKE) format-py

format-ts:
	-$(call RUN_NODE, pnpm run format, --rm)

format-py:
	-uv run pyfltr --exit-zero-even-if-formatted --commands=fast app

test:
	SKIP=pnpm-format,pyfltr uv run pre-commit run --all-files
	$(MAKE) test-ts
	$(MAKE) test-py

test-ts:
	$(call RUN_NODE, pnpm run format && pnpm run test && pnpm run build, --rm)

test-py:
	uv run pyfltr --exit-zero-even-if-formatted app

.PHONY: help sync deploy build start stop db-up db-down db-history hup restart-app logs ps healthcheck shell node-shell update update-ts update-py format format-ts format-py test test-ts test-py
