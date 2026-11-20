# One command source for local use, the agent hooks and CI (ADR 0004 D4).
# `bin/sdlc verify` runs `make check COMPONENT=<component>` for the active task.
COMPONENT ?= sdlc
COMPONENTS := web game schema data infra ci docs sdlc

.DEFAULT_GOAL := help
.PHONY: help check check-all dev preview e2e e2e-ui $(addprefix check-,$(COMPONENTS))

WEB := apps/web
need-web = @[ -f $(WEB)/package.json ] || { echo "$@: $(WEB) is not scaffolded yet (see docs/decisions/0001)"; exit 1; }

help: ## Show this help
	@grep -E '^[a-z0-9-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-12s %s\n", $$1, $$2}'

check: check-$(COMPONENT) ## COMPONENT=<name>: run one component's gates

check-all: $(addprefix check-,$(COMPONENTS)) ## Run every component's gates

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
	@pnpm --dir $(WEB) run test:e2e

e2e-ui: ## Run the end-to-end tests in Playwright's UI mode
	$(need-web)
	@pnpm --dir $(WEB) run test:e2e --ui

# A TypeScript gate runs the canonical scripts in ts-standards for one
# package, then Knip for the workspace. A missing package or script fails.
define ts-gate
	@[ -f $(1)/package.json ] || { echo "$@: $(1) is not scaffolded yet (see docs/decisions/0001)"; exit 1; }
	@for script in format:check lint typecheck test; do pnpm --dir $(1) run $$script || exit 1; done
	@pnpm run unused
endef

check-game: ## Gates for packages/game
	$(call ts-gate,packages/game)

check-schema: ## Gates for packages/schema
	$(call ts-gate,packages/schema)

check-web: ## Gates for apps/web, including the end-to-end tests
	$(call ts-gate,$(WEB))
	@pnpm --dir $(WEB) run test:e2e

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

# Each remaining gate is wired to the commands in the component's skill when
# that component is scaffolded. The Makefile is a kit file, so the tech lead makes
# that change in the main session. Until then the gate fails: a gate that
# can't run is not a pass.
check-data:
	@echo "$@: this gate is not configured yet (see docs/decisions/0004)"; exit 1
