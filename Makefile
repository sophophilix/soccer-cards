# One command source for local use, the agent hooks and CI (ADR 0004 D4).
# `bin/sdlc verify` runs `make check COMPONENT=<component> SCOPE=affected` for
# each component the active task's change touches.
COMPONENT ?= sdlc
COMPONENTS := web game schema data infra ci docs sdlc
# SCOPE=full runs every test, as CI does. SCOPE=affected runs the same static
# checks and only the tests a change since BASE can reach, without coverage
# thresholds. `sdlc verify` uses it (ADR 0004 D4, D14).
SCOPE ?= full
BASE ?= origin/main

# Heavy gates queue for a slot that every worktree and project on the machine
# shares, and run in their own process group (ADR 0012 D2, D4). Inside a slot
# `bin/sdlc slot` passes straight through. A CI runner holds one job, so CI
# skips the slot.
HEAVY := web game schema data
SLOT = $(if $(CI),,$(if $(filter $(1),$(HEAVY)),bin/sdlc slot --,))
# Off CI, end-to-end tests run in one browser with two workers. CI runs all
# three browsers and is the authority for them (ADR 0012 D1). E2E_ALL=1 runs
# every browser locally.
E2E_LOCAL := $(if $(CI)$(E2E_ALL),,--project=phone-chromium --workers=2)

.DEFAULT_GOAL := help
.PHONY: help check check-all dev preview e2e e2e-ui api-wrangler-guard api-db-local api-dev $(addprefix check-,$(COMPONENTS))

WEB := apps/web
need-web = @[ -f $(WEB)/package.json ] || { echo "$@: $(WEB) is not scaffolded yet (see docs/decisions/0001)"; exit 1; }

help: ## Show this help
	@grep -E '^[a-z0-9-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-12s %s\n", $$1, $$2}'

check: ## COMPONENT=<name>: run one component's gates
	@$(call SLOT,$(COMPONENT)) $(MAKE) -s --no-print-directory check-$(COMPONENT)

check-all: ## Run every component's gates
	@$(call SLOT,web) $(MAKE) -s --no-print-directory $(addprefix check-,$(COMPONENTS))

check-sdlc: ## The SDLC kit's own tests
	@python3 -I -m unittest discover -s tools/sdlc/tests -q

check-docs: ## Task briefs are valid
	@set -- docs/tasks/T-*.md; [ -e "$$1" ] || exit 0; bin/sdlc task-check "$$@"

# Local run and end-to-end targets (ADR 0001 D8, the ts-testing skill).
# Playwright starts the preview itself, so `make e2e` needs nothing running.
dev: ## Start the web app with hot reload
	$(need-web)
	@pnpm --dir $(WEB) run dev

preview: ## Build the web app and serve the build as production does
	$(need-web)
	@pnpm --dir $(WEB) run build && pnpm --dir $(WEB) run preview

e2e: ## Run the Playwright end-to-end tests against the local preview
	$(need-web)
	@$(call SLOT,web) pnpm --dir $(WEB) run test:e2e $(E2E_LOCAL)

e2e-ui: ## Run the end-to-end tests in Playwright's UI mode
	$(need-web)
	@pnpm --dir $(WEB) run test:e2e --ui

# The player API on the local Workers runtime (ADR 0008). pywrangler runs
# `npx --yes wrangler` inside itself, outside pnpm. The tech lead chose on
# 2026-11-21 to allow that locally only if the pnpm-locked wrangler is the
# copy npx finds. So these targets install it first, refuse to start if its
# version differs from pnpm-lock.yaml, put it first on PATH, and keep npm
# offline so npx can't fetch another copy. The kit refuses a bare `pywrangler`
# command. Deploys never use these targets: CI deploys with pnpm's wrangler.
API_WRANGLER = cd $(API) && PATH="$(CURDIR)/node_modules/.bin:$$PATH" npm_config_offline=true uv run --frozen pywrangler

api-wrangler-guard:
	@pnpm install --frozen-lockfile --silent
	@locked="$$(sed -n 's/^  wrangler@\([0-9][0-9.]*\):$$/\1/p' pnpm-lock.yaml | head -1)"; \
	have="$$(node_modules/.bin/wrangler --version 2>/dev/null | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"; \
	if [ -z "$$locked" ] || [ "$$locked" != "$$have" ]; then \
		echo "$@: node_modules/.bin/wrangler is '$$have' but pnpm-lock.yaml has '$$locked'. Refusing to run pywrangler."; exit 1; \
	fi

api-db-local: api-wrangler-guard ## Reset the API's local D1, apply its migrations and the invented local seed
	@rm -rf $(API)/.wrangler/state
	@$(API_WRANGLER) d1 migrations apply DB --local
	@$(API_WRANGLER) d1 execute DB --local --file=seeds/local.sql

api-dev: api-wrangler-guard ## Run the player API on the local Workers runtime (run make api-db-local first)
	@$(API_WRANGLER) dev

# A TypeScript gate runs the canonical scripts in ts-standards for one
# package, then Knip for the workspace. A missing package or script fails.
# The three static checks run in parallel: pnpm runs every script the pattern
# matches at once. The affected scope runs the Vitest tests whose import graph
# reaches a file changed since BASE.
define ts-gate
	@[ -f $(1)/package.json ] || { echo "$@: $(1) is not scaffolded yet (see docs/decisions/0001)"; exit 1; }
	@pnpm --dir $(1) run '/^(format:check|lint|typecheck)$$/'
	@if [ "$(SCOPE)" = affected ]; then pnpm --dir $(1) exec vitest run --changed $(BASE) --passWithNoTests; else pnpm --dir $(1) run test; fi
	@pnpm run unused
endef

check-game: ## Gates for packages/game
	$(call ts-gate,packages/game)

check-schema: ## Gates for packages/schema
	$(call ts-gate,packages/schema)

check-web: ## Gates for apps/web, including the end-to-end tests
	$(call ts-gate,$(WEB))
	@if [ "$(SCOPE)" != affected ]; then pnpm --dir $(WEB) run test:e2e $(E2E_LOCAL); \
	else specs="$$(bin/sdlc e2e-specs $(BASE))"; \
		if [ "$$specs" = all ] && [ -n "$(CI)" ]; then pnpm --dir $(WEB) run test:e2e; \
		elif [ "$$specs" = all ]; then echo "check-web: the change reaches every end-to-end spec, so CI runs them (ADR 0012 D1)"; \
		elif [ -z "$$specs" ]; then echo "check-web: no end-to-end spec reaches this change"; \
		else echo "check-web: end-to-end specs for this change:" $$specs; pnpm --dir $(WEB) run test:e2e $(E2E_LOCAL) $$specs; fi; \
	fi

# Workflows are linted by actionlint and audited by zizmor (the
# ci-supply-chain skill). A missing tool fails the gate.
check-ci: ## Lint and audit the GitHub Actions workflows
	@for tool in actionlint zizmor; do command -v $$tool >/dev/null || { echo "$@: $$tool is not installed"; exit 1; }; done
	@actionlint
	@zizmor --offline .github

# OpenTofu is formatted, validated and tested against mock providers without
# a backend or credentials (the cloudflare-infra skill). Plans and
# applies run only in CI (ADR 0002 D3). A missing tool fails the gate.
check-infra: ## Format, validate and test the OpenTofu configuration
	@[ -d infra ] || { echo "$@: infra/ is not scaffolded yet (see docs/decisions/0002)"; exit 1; }
	@command -v tofu >/dev/null || { echo "$@: tofu is not installed"; exit 1; }
	@tofu -chdir=infra fmt -check -recursive
	@tofu -chdir=infra init -backend=false -input=false -lockfile=readonly
	@tofu -chdir=infra validate
	@tofu -chdir=infra test

# The Python pipeline runs its tools through the locked uv environment
# (ADR 0006 D5, the python-standards skill). A missing project or tool fails.
PIPELINE := data/pipeline
# The player API (ADR 0008) is Python under uv too, so the data gate covers it
# once it exists. The same tools and rules apply to both projects.
API := apps/api
check-data: ## Gates for the Python data pipeline and the Python player API
	@[ -f $(PIPELINE)/pyproject.toml ] || { echo "$@: $(PIPELINE) is not scaffolded yet (see docs/decisions/0006)"; exit 1; }
	@command -v uv >/dev/null || { echo "$@: uv is not installed"; exit 1; }
	@# The affected scope runs a project's tools only when the change touches it.
	@if [ "$(SCOPE)" != affected ] || bin/sdlc touched $(BASE) data/; then \
		cd $(PIPELINE) && uv sync --locked --quiet && \
		uv run --frozen ruff check . && \
		uv run --frozen ruff format --check . && \
		uv run --frozen mypy src tests && \
		uv run --frozen bandit -q -c pyproject.toml -r src && \
		uv run --frozen pytest -q; \
	else echo "check-data: $(PIPELINE) is unchanged"; fi
	@if [ -f $(API)/pyproject.toml ] && { [ "$(SCOPE)" != affected ] || bin/sdlc touched $(BASE) $(API)/; }; then \
		cd $(API) && uv sync --locked --quiet && \
		uv run --frozen ruff check . && \
		uv run --frozen ruff format --check . && \
		uv run --frozen mypy src tests && \
		uv run --frozen bandit -q -c pyproject.toml -r src && \
		uv run --frozen pytest -q; \
	fi
