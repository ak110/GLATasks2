include .env
ifndef COMPOSE_PROFILE
$(error COMPOSE_PROFILEが定義されていません)
endif

RUN_ARGS += --user=$(shell id --user):$(shell id --group) --ulimit="core=0"

export DOCKER_BUILDKIT=1
export BETTER_EXCEPTIONS=1

# pnpm実行用の共通コマンド
RUN_NODE = docker run --rm $(2) \
	--volume=${PWD}:/usr/src/app \
	--workdir=/usr/src/app \
	--user=$(shell id -u):$(shell id -g) \
	--env=HOME=/usr/src/app \
	--env=PNPM_HOME=/usr/src/app/.local/share/pnpm \
	node:lts \
	bash -xc '\
		mkdir -p ~/.local/bin && \
		corepack enable --install-directory ~/.local/bin && \
		export PATH=~/.local/bin:$$PNPM_HOME:$$PATH && \
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

update:
	$(call RUN_NODE, pnpm update)
	uv sync --upgrade
	uv export --no-hashes --no-annotate > docker/requirements.txt
	$(MAKE) test

format:
	-$(call RUN_NODE, pnpm run format)
	-uv run pyfltr --exit-zero-even-if-formatted --commands=fast app

test:
	$(call RUN_NODE, pnpm run format && pnpm run test && pnpm run build)
	uv run pyfltr --exit-zero-even-if-formatted app

build:
	docker compose pull
ifeq ($(COMPOSE_PROFILE), development)
	docker compose --progress=plain build --pull
else
	$(call RUN_NODE, pnpm install && pnpm run build)
endif

build-ts:
	$(call RUN_NODE, pnpm run test && pnpm run build)

deploy: build
	mkdir -p data
	docker compose down
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
	$(call RUN_NODE, bash, --interactive --tty)

.PHONY: help sync update format test build deploy stop hup logs ps start-devserver logs-devserver sql shell node-shell
