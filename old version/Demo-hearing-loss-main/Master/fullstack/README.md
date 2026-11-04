# Dr. Bunny — Full-Stack Scaffold (Giai đoạn B)

Tách từ prototype `index.html` thành `/frontend` (React + Vite + Tailwind) và
`/backend` (FastAPI). Giữ nguyên 100% logic lõi: rụng chữ theo âm vị, audiogram 2
chế độ PLOTS/SOUNDS với masking xám, chat Dr. Bunny hybrid.

## Cấu trúc
```
fullstack/
├── backend/                 # FastAPI
│   ├── main.py              # routes
│   ├── core/
│   │   ├── constants.py     # FREQS, presets, scenarios, sound items (nguồn chân lý)
│   │   ├── phoneme.py       # rụng chữ theo tần số âm vị
│   │   ├── graphrag.py      # KG + retrieve + system prompt + LLM (fallback hardcoded)
│   │   ├── noise.py         # sinh nhiễu WAV (procedural + lặp GAN có crossfade) + mix SNR
│   │   └── gan.py           # generator WaveGAN (tuỳ chọn, cần torch + GAN_CKPT)
│   └── requirements.txt
└── frontend/                # React + Vite + Tailwind
    └── src/
        ├── store.js         # state trung tâm (zustand) cho cả 3 tab
        ├── api.js           # gọi backend (có fallback offline)
        ├── data/constants.js# bản sao hằng số (đồng bộ với backend)
        ├── util/phoneme.js  # rụng chữ phía client (tức thì)
        └── components/      # Simulator.jsx, Audiogram.jsx, Chat.jsx
```

## Chạy
**Backend** (cổng 8000):
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
**Frontend** (cổng 5173, proxy `/api` -> 8000):
```bash
cd frontend
npm install
npm run dev
```
Mở http://localhost:5173

## Bật LLM thật cho chat (tầng 2, tuỳ chọn)
Đặt biến môi trường trước khi chạy backend:
```bash
export LLM_API_KEY=...            # bắt buộc để bật tầng 2
export LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4   # mặc định GLM
export LLM_MODEL=glm-4-flash
```
Không có key -> chat tự lùi về tầng 1 (hardcoded, đọc trực tiếp audiogram).

## Bật GAN thật cho nhiễu (tuỳ chọn)
`export GAN_CKPT=/path/to/generator.pt` + cài `torch`. Kiến trúc nằm sẵn trong
`backend/core/gan.py` (đầu ra 16384 mẫu, kiểm bằng test). Không có -> nhiễu procedural
(độ dốc phổ kiểu lời nói, điều biên ~4 Hz, chuẩn hoá RMS theo cấp độ).

## Trạng thái
Xem `../BUILD_LOG.md` mục 6c. Tóm tắt: backend test pass toàn bộ, frontend build
sạch, e2e (React → proxy → FastAPI) đã verify. Chưa có: checkpoint GAN thật (R-01),
chuẩn âm vị tiếng Việt (R-04), test trên thiết bị thật.

## Kiểm thử
```bash
python -m pytest tests -q            # 30 test: API, validation, nhiễu, GAN, âm vị, GraphRAG
python tests/eval_retrieval.py       # đo GraphRAG: bộ dev + holdout (top-1/top-2)
python tests/make_fixtures.py        # sinh lại fixture âm vị (chạy lại sau khi đổi phoneme.py)
(cd frontend && npm test)            # parity JS <-> Python trên 87 ca
python tests/e2e_browser.py          # cần backend :8000 và frontend :5173 đang chạy
```
`e2e_browser.py` đọc `CHROME_PATH` (đường dẫn Chromium) và `APP_URL` nếu cần.
Lưu ý: bộ holdout đã dùng để kiểm tra khi chỉnh từ khoá; cần bộ mới trước khi chỉnh tiếp.
