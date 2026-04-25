.PHONY: help install dev test lint format run dashboard docker clean

# ─── Default ──────────────────────────────────────────────────────────────────

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# ─── Setup ────────────────────────────────────────────────────────────────────

install: ## Install production dependencies
	pip install -e .

dev: ## Install all dependencies (dev + dashboard + gcp)
	pip install -e ".[all]"
	pre-commit install 2>/dev/null || true

# ─── Pipeline ─────────────────────────────────────────────────────────────────

run: ## Run the full ETL pipeline
	python -m src.cli run

run-sample: ## Run pipeline for a few books only (fast test)
	python -m src.cli run --books "GEN,PSA,JHN,REV"

info: ## Show database summary
	python -m src.cli info

query: ## Run a SQL query (usage: make query SQL="SELECT ...")
	python -m src.cli query "$(SQL)"

# ─── Dashboard ────────────────────────────────────────────────────────────────

dashboard: ## Launch the Streamlit dashboard
	streamlit run dashboard/app.py

# ─── Quality ──────────────────────────────────────────────────────────────────

test: ## Run all tests with coverage
	pytest -v --cov=src --cov-report=term-missing -m "not integration and not slow"

test-all: ## Run all tests including integration
	pytest -v --cov=src --cov-report=term-missing --cov-report=html

lint: ## Run linter
	ruff check src/ tests/

format: ## Auto-format code
	ruff format src/ tests/
	ruff check --fix src/ tests/

typecheck: ## Run type checker
	mypy src/ --ignore-missing-imports

quality: lint typecheck test ## Run all quality checks

# ─── Docker ───────────────────────────────────────────────────────────────────

docker-build: ## Build Docker images
	docker compose build

docker-run: ## Run pipeline + dashboard via Docker
	docker compose up

docker-test: ## Run tests in Docker
	docker compose --profile test run --rm tests

# ─── Cleanup ──────────────────────────────────────────────────────────────────

clean: ## Remove generated files and caches
	rm -rf data/raw/*.json data/processed/*.csv data/analytics/*.csv data/analytics/*.duckdb
	rm -rf .pytest_cache .mypy_cache .ruff_cache htmlcov .coverage
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
