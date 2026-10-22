"""Hằng số dùng chung cho backend. Frontend giữ bản sao trong src/data/constants.js
-> khi sửa phải đồng bộ cả hai (xem BUILD_LOG R-06)."""

FREQS = [250, 500, 1000, 2000, 4000, 8000]

LEVEL_PRESETS = {
    "Normal":   [10, 10, 10, 15, 15, 15],
    "Mild":     [15, 20, 25, 35, 40, 45],
    "Moderate": [25, 35, 45, 55, 65, 70],
    "Severe":   [55, 65, 75, 85, 95, 100],
}

# Tần số cắt low-pass (Hz) theo cấp độ — mô phỏng mất dải cao của ốc tai
LEVEL_CUTOFF = {"Normal": 8000, "Mild": 2600, "Moderate": 1100, "Severe": 420}
# Gain nhiễu nền theo cấp độ
LEVEL_NOISE_GAIN = {"Normal": 0.03, "Mild": 0.12, "Moderate": 0.28, "Severe": 0.45}

# Cấu hình nhiễu đặc trưng từng kịch bản: tần số nhấn (Hz) + độ rộng dải Q
SCENARIOS = {
    "shopping":     {"noise_freq": 1800, "noise_q": 1.2},
    "conversation": {"noise_freq": 600,  "noise_q": 0.7},
    "meeting":      {"noise_freq": 1000, "noise_q": 1.0},
    "restaurant":   {"noise_freq": 1400, "noise_q": 0.6},
    "crowd":        {"noise_freq": 900,  "noise_q": 0.5},
    "car":          {"noise_freq": 220,  "noise_q": 2.0},
    "music":        {"noise_freq": 3200, "noise_q": 1.5},
}

SCENARIO_IDX = {k: i for i, k in enumerate(SCENARIOS)}  # cho embedding GAN

SOUND_ITEMS = [
    {"id": "water",    "label": "Vòi nước",        "freq": 250,  "db": 20},
    {"id": "ph_low",   "label": "Nguyên âm & âm trầm", "freq": 380,  "db": 42},
    {"id": "ph_mid",   "label": "Phụ âm trung-cao", "freq": 1800, "db": 28},
    {"id": "ph_high",  "label": "Phụ âm xát cao",   "freq": 5500, "db": 22},
    {"id": "talk",     "label": "Trò chuyện",       "freq": 1000, "db": 45},
    {"id": "birds",    "label": "Chim hót",         "freq": 4500, "db": 15},
    {"id": "dog",      "label": "Chó sủa",          "freq": 320,  "db": 70},
    {"id": "vacuum",   "label": "Máy hút bụi",      "freq": 2600, "db": 60},
    {"id": "piano",    "label": "Đàn piano",        "freq": 1000, "db": 80},
    {"id": "truck",    "label": "Xe tải",           "freq": 250,  "db": 98},
    {"id": "firework", "label": "Pháo hoa",         "freq": 550,  "db": 105},
    {"id": "plane",    "label": "Máy bay",          "freq": 3600, "db": 105},
    {"id": "moto",     "label": "Mô tô",            "freq": 7200, "db": 98},
]
