# Healthy Hearing — Master Project README

> **Healthy Hearing (Dr. Bunny)** là hệ thống mô phỏng trải nghiệm suy giảm thính lực và giáo dục thấu cảm. Thư mục `Master/` lưu prototype, backend, frontend, thuật toán lõi, tài liệu ngữ âm và bộ kiểm thử cho phiên bản full-stack.
>
> **Ranh giới y tế:** Đây là công cụ mô phỏng/giáo dục, không phải công cụ chẩn đoán thính lực lâm sàng và không thay thế bác sĩ hoặc chuyên gia thính học.

## 1. Đọc gì trước?

Nếu mới tiếp quản dự án, nên đọc theo thứ tự:

1. `Master/README.md` — bản đồ tổng quan toàn bộ thư mục Master.
2. `Master/fullstack/README.md` — hướng dẫn cài đặt, chạy backend/frontend và kiểm thử.
3. `Master/PROJECT_OVERVIEW.md` — kiến trúc, mục tiêu sản phẩm và luồng dữ liệu.
4. `Master/BUILD_LOG.md` — lịch sử phát triển, quyết định, lỗi và kết quả kiểm thử được ghi nhận.
5. `Master/fullstack/PHONEME_MAP_VI.md` — mô hình tokenizer/âm vị tiếng Việt và giới hạn ngữ âm.
6. Đọc mã nguồn tương ứng trong `backend/`, `frontend/` và `tests/`.

> Build log là **lịch sử được ghi nhận**, không phải bằng chứng rằng code hiện tại vẫn chạy như vậy. Trước khi pitch hoặc phát hành, chạy lại build/test trên commit phát hành và xác nhận hành vi thực tế.

## 2. Cây thư mục

```text
Master/
├── README.md
├── BUILD_LOG.md
├── PROJECT_OVERVIEW.md
├── backend_core.py                 # Core logic của prototype ban đầu
├── index.html                      # Prototype HTML/JavaScript độc lập
│
└── fullstack/
    ├── README.md                   # Hướng dẫn setup/run/test cho full-stack
    ├── PHONEME_MAP_VI.md           # Tài liệu tokenizer/âm vị tiếng Việt
    │
    ├── backend/                    # FastAPI, mặc định cổng 8000
    │   ├── main.py                 # Khai báo API và kết nối các module lõi
    │   ├── requirements.txt        # Python dependencies
    │   └── core/
    │       ├── __init__.py
    │       ├── constants.py        # Dữ liệu chuẩn: tần số, preset, kịch bản, âm thanh
    │       ├── phoneme.py          # Tokenizer tiếng Việt và suy giảm hiển thị chữ
    │       ├── audiometry_eq.py    # EQ trợ thính 3-band, PTA-4, hồ sơ mẫu [v0.4]
    │       ├── graphrag.py         # Knowledge nodes, retrieval/ranking và LLM hook
    │       ├── noise.py            # Sinh noise WAV, DSP/FFT, điều biên và trộn SNR
    │       └── gan.py              # Conditional 1D-GAN/WaveGAN; cần xác minh inference
    │
    ├── frontend/                   # React 18 + Vite + TailwindCSS, mặc định cổng 5173
    │   ├── package.json            # Scripts và JavaScript dependencies
    │   ├── package-lock.json       # Khóa phiên bản dependencies npm
    │   ├── vite.config.js          # Dev server và proxy API
    │   ├── index.html              # HTML entry point của Vite
    │   └── src/
    │       ├── main.jsx            # Mount React app
    │       ├── App.jsx              # Khung UI, navigation, trạng thái kết nối
    │       ├── store.js             # State dùng chung bằng Zustand
    │       ├── api.js               # API client và offline fallback
    │       ├── index.css            # Style, hiệu ứng và responsive layout
    │       ├── data/constants.js    # Nội dung hiển thị, kịch bản, icon, fallback
    │       ├── util/
    │       │   ├── phoneme.js       # Bản JavaScript của tokenizer tiếng Việt
    │       │   └── audio.js         # Web Audio DSP, EQ/compression và tiện ích 2AFC
    │       └── components/
    │           ├── Simulator.jsx    # Tab 1: mô phỏng audio và văn bản
    │           ├── Chat.jsx         # Tab 2: hỏi đáp Dr. Bunny
    │           └── Audiogram.jsx    # Tab 3: audiogram, masking và 2AFC
    │
    └── tests/
        ├── test_backend.py          # API và logic backend bằng pytest
        ├── eval_retrieval.py        # Đánh giá retrieval
        ├── make_fixtures.py         # Sinh fixture tokenizer
        ├── fixtures/
        │   └── phoneme_vi.json      # Bộ test tiếng Việt đối chiếu Python/JS
        └── e2e_browser.py           # Browser E2E bằng Playwright
```

**Lưu ý cấu trúc:** cây trên phản ánh mô tả của phiên bản được cung cấp. Nếu `audiometry_eq.py` hoặc file khác không tồn tại trong repository hiện tại, hãy đối chiếu `git ls-files`, câu lệnh import và nội dung `main.py`. Không tạo file rỗng để che lỗi thiếu module.

## 3. Healthy Hearing làm gì?

### 3.1 Simulator — mô phỏng trải nghiệm nghe

Người dùng chọn kịch bản đời thường và mức mô phỏng. Hệ thống kết hợp xử lý âm thanh với thay đổi hiển thị văn bản để người dùng đối chiếu âm thanh và lời nói.

Các mức Normal, Mild, Moderate và Severe là **mức mô phỏng của sản phẩm**, không tự động tương đương với phân loại hay phép đo lâm sàng. Chất lượng mô phỏng cần được đánh giá riêng bằng kiểm thử kỹ thuật và nghe thử phù hợp.

### 3.2 Interactive Audiogram — đồ thị thính lực tương tác

Người dùng điều chỉnh các điểm ngưỡng trên audiogram. Frontend cập nhật đường cong và trạng thái sound items theo logic masking trong code.

Đồ thị của ứng dụng là công cụ trực quan hóa. Không coi giá trị người dùng tự nhập hoặc kết quả mô phỏng là phép đo thính lực đã hiệu chuẩn.

### 3.3 Dr. Bunny Q&A — hỏi đáp/giải thích

Frontend gửi câu hỏi tới backend để lấy phản hồi từ logic retrieval hoặc fallback. `graphrag.py` chứa phần tri thức/xếp hạng được mô tả trong codebase.

Không gọi đây là GraphRAG hoàn chỉnh nếu chưa xác minh có truy xuất đồ thị thực sự. Không trình bày câu trả lời mẫu/hardcoded như thể do LLM sinh ra.

## 4. Kiến trúc và luồng dữ liệu

```text
Người dùng
   │
   ▼
React UI (App.jsx + 3 tabs)
   │
   ├── Zustand store (store.js)
   │      └── trạng thái dùng chung giữa Simulator / Chat / Audiogram
   │
   ▼
API client (api.js)
   │
   ▼
Vite proxy (frontend :5173)
   │
   ▼
FastAPI (backend/main.py, mặc định :8000)
   │
   ├── constants.py       cấu hình và dữ liệu chuẩn
   ├── phoneme.py         tokenizer và suy giảm hiển thị chữ
   ├── noise.py           sinh/trộn noise
   ├── audiometry_eq.py   EQ/PTA-4 nếu module có trong bản hiện tại
   └── graphrag.py        retrieval/Q&A và LLM hook
          │
          ▼
   JSON / WAV / thông tin mô phỏng
          │
          ▼
Frontend cập nhật UI và/hoặc phát audio
```

| Lớp | Trách nhiệm | Không nên làm |
|---|---|---|
| `frontend/src/components/` | Nhận tương tác và hiển thị | Tự tạo logic y khoa không có trong core |
| `store.js` | State dùng chung | Trở thành nguồn chuẩn thứ hai cho dữ liệu backend |
| `api.js` | HTTP, lỗi và fallback | Che lỗi backend bằng cách giả vờ request thành công |
| `backend/main.py` | API, validation, gọi core | Nhồi toàn bộ thuật toán vào endpoint |
| `backend/core/` | Thuật toán và cấu hình lõi | Phụ thuộc trực tiếp vào giao diện React |
| `tests/` | Xác minh logic/API/parity/E2E | Chỉ kiểm tra request trả HTTP 200 |

Frontend và backend phải thống nhất URL API. Nếu frontend gọi `/api/...` còn FastAPI khai báo route `/...`, cần xác minh `vite.config.js`, proxy/rewrite và `api.js` có xử lý prefix phù hợp hay không.

## 5. Vai trò từng file quan trọng

### Tài liệu và prototype ở cấp `Master/`

| File | Mục đích |
|---|---|
| `README.md` | Điểm bắt đầu; bản đồ file và kiến trúc toàn Master |
| `PROJECT_OVERVIEW.md` | Mục tiêu, kiến trúc, module và trạng thái dự án |
| `BUILD_LOG.md` | Nhật ký phát triển, quyết định, lỗi và kết quả test được ghi lại |
| `backend_core.py` | Logic backend của prototype ban đầu; không mặc định full-stack đang dùng file này |
| `index.html` | Prototype HTML/JavaScript độc lập để tham khảo/đối chiếu |

Prototype cấp `Master/` và ứng dụng ở `Master/fullstack/` là hai cách triển khai khác nhau. Xác định người dùng đang chạy phiên bản nào trước khi sửa.

### Backend

| File | Giải thích |
|---|---|
| `main.py` | Khai báo endpoint, request/response, validation và gọi core |
| `constants.py` | Cấu hình chuẩn: tần số, preset, kịch bản và sound items |
| `phoneme.py` | Phân tích âm tiết/đơn vị tiếng Việt và làm mờ/loại bỏ phần văn bản theo mức mô phỏng |
| `audiometry_eq.py` | Module được mô tả cho EQ trợ thính 3-band, PTA-4 và hồ sơ mẫu. Công thức và ý nghĩa lâm sàng cần review trước khi công bố |
| `graphrag.py` | Knowledge nodes, chuẩn hóa/truy vấn, ranking và hook LLM theo phiên bản thực tế |
| `noise.py` | Sinh noise WAV, xử lý DSP/FFT, điều biên và trộn theo SNR |
| `gan.py` | Module conditional 1D-GAN. Chỉ xác nhận GAN hoạt động khi có dependency, checkpoint hợp lệ và inference được kiểm tra |
| `requirements.txt` | Python dependencies; xem file thật để biết phiên bản chính xác |

### Frontend

| File | Giải thích |
|---|---|
| `package.json` | Scripts chạy dev/build và danh sách package |
| `package-lock.json` | Khóa cây dependency để cài đặt tái lập |
| `vite.config.js` | Vite và proxy trong môi trường phát triển |
| `src/main.jsx` | Khởi tạo React |
| `src/App.jsx` | Khung UI, điều hướng 3 tab và trạng thái kết nối |
| `src/store.js` | State dùng chung giữa các tab |
| `src/api.js` | Giao tiếp HTTP và offline fallback |
| `src/index.css` | Style, hiệu ứng chữ mờ và responsive |
| `src/data/constants.js` | Nội dung trình bày/fallback; ghép dữ liệu theo ID với backend |
| `src/util/phoneme.js` | Bản JS tokenizer; cần kiểm tra parity với Python |
| `src/util/audio.js` | Web Audio API/DSP, EQ/compression và tiện ích 2AFC theo phiên bản |
| `src/components/Simulator.jsx` | UI mô phỏng audio, văn bản và playback |
| `src/components/Chat.jsx` | UI hỏi đáp, câu hỏi nhanh và phản hồi |
| `src/components/Audiogram.jsx` | Đồ thị, drag interaction, masking và 2AFC |

### Tests

| File | Mục đích |
|---|---|
| `test_backend.py` | API, validation và logic backend |
| `eval_retrieval.py` | Đánh giá retrieval; kiểm tra cách tách dev/holdout |
| `make_fixtures.py` | Tạo dữ liệu test tokenizer |
| `fixtures/phoneme_vi.json` | Các ca chuẩn để so sánh Python/JavaScript |
| `e2e_browser.py` | Tự động hóa hành vi trình duyệt bằng Playwright |

## 6. API được mô tả

Các endpoint được nêu trong cấu trúc dự án:

| Endpoint | Mục đích dự kiến |
|---|---|
| `/health` | Kiểm tra backend |
| `/presets` | Lấy preset mức mô phỏng |
| `/degrade` | Biến đổi văn bản/đầu vào theo cấu hình suy giảm |
| `/graphrag` | Truy vấn hỏi đáp/retrieval |
| `/noise` | Sinh hoặc trả audio noise WAV |
| `/hearing-aid-eq` | EQ trợ thính 3-band theo module mới |

**Phải xác minh với code:** bảng trên dựa trên mô tả dự án. Đối chiếu decorators trong `backend/main.py` để biết route, HTTP method, request/response schema và lỗi thực tế. Không giả định `/hearing-aid-eq` đã hoạt động chỉ vì được nêu trong tài liệu.

Khi hoàn thiện API reference, mỗi route cần có method/path, schema, validation, status code, ví dụ request/response và test liên quan.

## 7. Cài đặt và chạy trên Windows

> Chạy lệnh từ các thư mục tương ứng. Đối chiếu `fullstack/README.md`, `requirements.txt` và `package.json` nếu script thực tế khác ví dụ dưới đây.

### 7.1 Kiểm tra công cụ

```powershell
python --version
python -m pip --version
node --version
npm --version
git --version
```

### 7.2 Backend

Mở terminal thứ nhất:

```powershell
cd "C:\0nlyCodingSource\Demo IEC\Master\fullstack\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Nếu PowerShell chặn activate script, có thể gọi trực tiếp:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Kiểm tra `http://127.0.0.1:8000/health` và `http://127.0.0.1:8000/docs`. Chỉ coi endpoint hoạt động khi phản hồi đúng schema, không chỉ vì trang mở được.

### 7.3 Frontend

Mở terminal thứ hai:

```powershell
cd "C:\0nlyCodingSource\Demo IEC\Master\fullstack\frontend"
npm ci
npm run dev
```

Mở URL được Vite in ra, thường là `http://localhost:5173`.

Nếu `npm ci` thất bại do lockfile không đồng bộ, kiểm tra `package.json` và `package-lock.json` trước khi cân nhắc `npm install`; không tự xóa lockfile.

### 7.4 Test backend

```powershell
cd "C:\0nlyCodingSource\Demo IEC\Master\fullstack\backend"
python -m pytest -q
```

### 7.5 Python–JavaScript parity

Tại thư mục frontend, xem scripts thực tế:

```powershell
npm run
```

Nếu có script `check-parity`, chạy:

```powershell
npm run check-parity
```

Không giả định script tồn tại nếu chưa kiểm tra `package.json`.

### 7.6 Browser E2E

Cài Playwright theo hướng dẫn trong README/tests và kiểm tra các biến môi trường mà `e2e_browser.py` yêu cầu. Backend và frontend phải chạy đúng URL trước khi thực hiện E2E.

## 8. Nguyên tắc kỹ thuật cần giữ

### Single source of truth
- Backend là nguồn chuẩn cho giá trị thuật toán nếu API đã cung cấp.
- Frontend có thể giữ emoji, nhãn và nội dung hiển thị theo ID.
- Khi ghép dữ liệu, kiểm tra ID thiếu/trùng và fallback rõ ràng.
- Không để hai nơi có cùng một tham số thuật toán nhưng cập nhật độc lập.

### Tokenizer tiếng Việt
- Kiểm tra âm đầu, nguyên âm, âm cuối và cụm chữ.
- Xem xét chuẩn hóa Unicode NFC.
- Dùng fixture chung để so sánh Python và JavaScript.
- Parity chỉ chứng minh hai bản code cho kết quả giống nhau; **không tự chứng minh thuật toán đúng về ngữ âm học**.

### Audio DSP
- Kiểm tra sample rate, số kênh, độ dài, dtype và NaN/Inf.
- Kiểm tra clipping, RMS và khả năng tái lập nếu có seed.
- Phân biệt noise procedural với noise sinh từ GAN.
- SNR nội bộ không tương đương dB SPL đã hiệu chuẩn trên tai nghe/loa thật.

### Audiogram và masking
- Kiểm tra dấu bất đẳng thức và ánh xạ tần số log.
- Drag interaction không được làm lệch overlay hoặc phá state.
- Không gọi giá trị tự nhập là kết quả đo thính lực lâm sàng.
- Chỉ hiển thị SII nếu có thuật toán tính phù hợp và tài liệu giải thích.

### Retrieval/Q&A
- Chuẩn hóa truy vấn và từ khóa nhất quán.
- Kiểm tra ranh giới từ, dấu tiếng Việt và ranking.
- Dùng dev/holdout độc lập; nếu đã dùng holdout để tinh chỉnh thì điểm số không còn độc lập.
- Phân biệt keyword ranking, graph retrieval và GraphRAG.
- Nội dung sức khỏe cần nguồn, giới hạn và fallback rõ ràng.

## 9. Trạng thái và giới hạn phải công bố trung thực

Dùng nhãn:
- **Verified:** đã kiểm tra trên phiên bản hiện tại và có bằng chứng.
- **Historical:** chỉ được ghi trong log trước đây, chưa chạy lại.
- **Partially verified:** mới kiểm tra được một phần.
- **Planned:** mới là kế hoạch.
- **Blocked:** thiếu công cụ, dữ liệu, checkpoint hoặc môi trường.

Các điểm cần xác minh trước khi phát hành:
- `audiometry_eq.py` và `/hearing-aid-eq` có thực sự hiện diện/được gọi trong code hiện tại không.
- GAN có checkpoint, dependency và inference chạy được không.
- Chất lượng audio đã được nghe thử và đánh giá phù hợp chưa.
- Retrieval có graph retrieval thực sự hay chủ yếu keyword/ranking/fallback.
- SII hoặc các chỉ số khác có được tính bằng công thức phù hợp không.
- README, screenshot, link demo và code có đồng nhất không.
- Các tuyên bố y tế/ngữ âm có nguồn đúng và ngữ cảnh rõ ràng không.

## 10. GitHub và bảo mật

Trước khi commit:
- Không commit `.env`, API keys, access tokens, credentials hoặc dữ liệu cá nhân.
- Kiểm tra `.gitignore`.
- Xem `git status` và `git diff --cached` trước commit.
- Chỉ thêm audio/ảnh khi có quyền sử dụng và chúng có giá trị với repo.
- Không commit `node_modules`, `.venv`, cache hoặc build artifacts nếu không có lý do.
- Giữ `package-lock.json` nếu cần cài đặt npm tái lập.
- Không xóa file gốc chỉ để repo trông gọn hơn khi chưa hiểu dependency.

Lệnh kiểm tra phổ biến:

```powershell
git status
git diff --check
git diff --cached --stat
git diff --cached --name-status
```

## 11. Lộ trình tiếp quản khuyến nghị

1. **Inventory:** kiểm tra file thật, imports và route đang tồn tại.
2. **Reproduce:** cài đặt theo README, chạy backend/frontend.
3. **Baseline:** chạy pytest, parity, build và E2E mà môi trường hỗ trợ.
4. **Correctness:** sửa lỗi tái hiện được và bổ sung regression test.
5. **Audio audit:** xác minh audio contract, DSP và playback.
6. **Retrieval audit:** đánh giá ranking với bộ câu hỏi độc lập.
7. **UX/responsive:** thử các viewport mục tiêu và tương tác.
8. **Documentation:** cập nhật README, architecture, test report và limitations.
9. **Release:** kiểm tra link, secrets và assets trước khi public.

Không tối ưu chỉ vì code có thể viết ngắn hơn. Mỗi thay đổi cần vấn đề cụ thể, bằng chứng, nguyên nhân, bản vá và test sau sửa.

## 12. Tóm tắt nhanh

| Thành phần | Công nghệ chính | Vai trò |
|---|---|---|
| Prototype | HTML / JavaScript | Bản thử nghiệm ban đầu |
| Frontend | React 18, Vite, TailwindCSS, Zustand | UI, state, mô phỏng và tương tác |
| Backend | Python, FastAPI | API và kết nối thuật toán |
| Phoneme | Python + JavaScript | Tokenizer và suy giảm hiển thị chữ |
| Audio | Web Audio API, NumPy/FFT, WAV | DSP, noise, EQ theo phiên bản |
| Retrieval | Python, knowledge nodes/ranking, LLM hook | Q&A và truy xuất thông tin |
| GAN | PyTorch nếu được cấu hình | Nhánh sinh nhiễu học sâu; cần xác minh inference |
| Testing | pytest, fixtures, Playwright | Backend, parity và E2E |

**Thông điệp cốt lõi:** Healthy Hearing là công cụ mô phỏng và giáo dục thấu cảm. Mọi tuyên bố về độ chính xác thính giác, sàng lọc, chỉ số nghe hoặc hiệu quả y tế phải dựa trên phương pháp và bằng chứng phù hợp. Build thành công, API trả 200 và hai bản tokenizer cho kết quả giống nhau là những kiểm tra hữu ích, nhưng không tự chứng minh mô hình chính xác về mặt lâm sàng.
