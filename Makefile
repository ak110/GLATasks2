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

hup:
	docker compose kill -s HUP

logs:
	docker compose logs -ft

ps:
	docker compose ps

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
	$(call RUN_NODE, corepack prepare pnpm@latest --activate && pnpm update, --rm)

update-py:
	uv sync --upgrade
	uv export --no-hashes --no-annotate > docker/requirements.txt

format:
	$(MAKE) format-ts
	$(MAKE) format-py

format-ts:
	-$(call RUN_NODE, pnpm run format, --rm)

format-py:
	-uv run pyfltr --exit-zero-even-if-formatted --commands=fast app

test:
	$(MAKE) test-ts
	$(MAKE) test-py

test-ts:
	$(call RUN_NODE, pnpm run format && pnpm run test && pnpm run build, --rm)

test-py:
	uv run pyfltr --exit-zero-even-if-formatted app

.PHONY: help sync update format test build deploy stop hup logs ps start-devserver logs-devserver sql shell node-shell
