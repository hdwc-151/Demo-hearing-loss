# Dr. Bunny — lệnh tắt cho người phát triển. `make help` để xem danh sách.
.PHONY: help install dev-api dev-web test test-api test-web e2e demo build android ios assets fixtures check docker clean
PY ?= python

help:           ## Hiện danh sách lệnh
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

install:        ## Cài thư viện backend và frontend
	$(PY) -m pip install -r backend/requirements-tested.txt
	cd frontend && npm ci

dev-api:        ## Chạy backend FastAPI ở :8000
	cd backend && $(PY) -m uvicorn main:app --reload --port 8000

dev-web:        ## Chạy frontend Vite ở :5173 (proxy /api sang :8000)
	cd frontend && npm run dev

test: test-api test-web   ## Chạy toàn bộ test nhanh (không cần trình duyệt)

test-api:       ## pytest backend + đo GraphRAG
	$(PY) -m pytest tests -q
	$(PY) tests/eval_retrieval.py

test-web:       ## Parity JS-Python + test logic frontend
	cd frontend && npm test

e2e:            ## E2E Chromium thật (cần: backend :8000 và frontend :5173 đang chạy)
	cd tests && $(PY) e2e_browser.py && $(PY) e2e_review.py && $(PY) e2e_mobile.py

demo:           ## Dựng bản demo MỘT FILE HTML -> demo/index.html rồi kiểm bằng Chromium
	cd frontend && npm run build:demo
	$(PY) tests/e2e_demo.py

build:          ## Build frontend (dist/)
	cd frontend && npm run build

android:        ## Đồng bộ web -> Android và mở Android Studio
	cd frontend && npm run android

ios:            ## Đồng bộ web -> iOS và mở Xcode (chỉ trên macOS)
	cd frontend && npm run ios

assets:         ## Vẽ lại biểu tượng + màn hình chờ rồi sinh mọi kích cỡ iOS/Android
	$(PY) mobile/resources/make_icons.py
	cd frontend && npm run assets

fixtures:       ## Sinh lại fixture parity + dữ liệu GraphRAG cho JS (sau khi đổi backend/core)
	$(PY) tests/make_fixtures.py

check: test build  ## Kiểm tra trước khi commit

docker:         ## Chạy bản đóng gói (backend + web/nginx) ở http://localhost:8080
	docker compose up --build

clean:          ## Xoá file sinh ra
	rm -rf frontend/dist frontend/dist-demo .pytest_cache backend/**/__pycache__ tests/__pycache__
