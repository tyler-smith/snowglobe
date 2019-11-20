.DEFAULT_GOAL := help

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

##
## UI
##

UI_DIRECTORY = "./ui"

serve_ui: ## Start dev UI server
	cd $(UI_DIRECTORY) && yarn serve

build_ui: ## Build production UI artifacts
	cd $(UI_DIRECTORY) && yarn build

lint_ui: ## Lint UI code
	cd $(UI_DIRECTORY) && yarn lint

clean_ui: ## Purge build artifacts
	rm -r ./ui/dist || true

##
## Infrastructure
##

.PHONY: deploy_infrastructure

deploy_infrastructure: ## Deploy proxy and docker changes
	(cd ./infra && rsync -rav . snowglobe:/opt/snowglobe)
	ssh snowglobe -C "cd /opt/snowglobe && docker-compose up -d"
