import re
import math
import json
import numpy as np
from typing import Dict, List, Tuple

# ==============================================================================
# 1. MÔ HÌNH CONDITIONAL 1D-GAN SINH NHIỄU MÔI TRƯỜNG THÍNH HỌC (PYTORCH)
# ==============================================================================
try:
    import torch
    import torch.nn as nn

    class AcousticNoiseGeneratorGAN(nn.Module):
        """
        Conditional WaveGAN-style Generator:
        Nhận vector nhiễu ẩn z (latent_dim=64) và nhãn kịch bản c (num_scenarios=7)
        để sinh ra đoạn sóng âm nhiễu nền phi tĩnh (Non-stationary noise).
        """
        def __init__(self, latent_dim: int = 64, num_scenarios: int = 7, audio_len: int = 16384):
            super().__init__()
            self.embed = nn.Embedding(num_scenarios, 16)
            self.fc = nn.Linear(latent_dim + 16, 256 * 64)
            self.net = nn.Sequential(
                nn.ConvTranspose1d(256, 128, kernel_size=25, stride=4, padding=11, output_padding=1),
                nn.BatchNorm1d(128),
                nn.LeakyReLU(0.2),
                nn.ConvTranspose1d(128, 64, kernel_size=25, stride=4, padding=11, output_padding=1),
                nn.BatchNorm1d(64),
                nn.LeakyReLU(0.2),
                nn.ConvTranspose1d(64, 1, kernel_size=25, stride=16, padding=5, output_padding=1),
                nn.Tanh()
            )

        def forward(self, z: torch.Tensor, scenario_idx: torch.Tensor) -> torch.Tensor:
            c_emb = self.embed(scenario_idx)
            x = torch.cat([z, c_emb], dim=-1)
            x = self.fc(x).view(-1, 256, 64)
            return self.net(x) # Output shape: (Batch, 1, 16384)
except ImportError:
    pass


# ==============================================================================
# 2. THUẬT TOÁN LÀM MẤT CHỮ CÁI THEO ÂM VỊ (PHONEME VISUAL DEGRADATION)
# ==============================================================================
def degrade_text_by_hearing_loss(text: str, level: str) -> str:
    """
    Làm biến mất chữ cái theo đúng tần số âm vị học (Speech Banana).
    Giữ nguyên khoảng trắng để câu chữ hiển thị đúng vị trí bị khuyết.
    """
    if level == "Normal":
        return text

    mild_digraphs = [r'th', r'sh', r'ph', r'kh']
    mild_chars = set("sfzxvSFZXV")

    moderate_digraphs = [r'ch', r'tr', r'gh', r'ght']
    moderate_chars = set("tkcpgdhbđqTKCPGDHBĐQ")

    severe_chars = set("mnlrwjyMNLRWJY0123456789")

    res = text
    if level in ["Mild", "Moderate", "Severe"]:
        for p in mild_digraphs:
            res = re.sub(p, lambda m: " " * len(m.group(0)), res, flags=re.IGNORECASE)

    if level in ["Moderate", "Severe"]:
        for p in moderate_digraphs:
            res = re.sub(p, lambda m: " " * len(m.group(0)), res, flags=re.IGNORECASE)

    out = []
    for ch in res:
        if level == "Mild" and ch in mild_chars:
            out.append(" ")
        elif level == "Moderate" and (ch in mild_chars or ch in moderate_chars):
            out.append(" ")
        elif level == "Severe" and (ch in mild_chars or ch in moderate_chars or ch in severe_chars):
            out.append(" ")
        else:
            out.append(ch)
    return "".join(out)


# ==============================================================================
# 3. KIẾN TRÚC GRAPHRAG + SYSTEM PROMPT CHO DR. BUNNY AGENT
# ==============================================================================
AUDIOLOGY_KNOWLEDGE_GRAPH = {
    "nodes": [
        {
            "id": "HIGH_FREQ_LOSS",
            "freq_range": [2000, 8000],
            "phonemes_affected": ["s", "x", "f", "ph", "th", "sh", "t", "k", "ch", "p"],
            "sounds_affected": ["Tiếng chim hót", "Tiếng thì thầm", "Giọng trẻ em và phụ nữ"],
            "symptoms": "Nghe thấy người khác nói nhưng không phân biệt được từ rõ ràng, hay nhầm các từ có vần giống nhau.",
            "advice": "Đề nghị người nói nhìn thẳng mặt để đọc khẩu hình môi, nói chậm rãi, tránh nói vọng từ phòng khác."
        },
        {
            "id": "LOW_MID_FREQ_LOSS",
            "freq_range": [250, 1000],
            "phonemes_affected": ["m", "n", "ng", "b", "d", "a", "o", "u", "e"],
            "sounds_affected": ["Tiếng nước nhỏ giọt", "Tiếng bước chân", "Tiếng chó sủa trầm"],
            "symptoms": "Cảm giác âm thanh chung bị nhỏ đi rõ rệt ngay cả trong phòng yên tĩnh.",
            "advice": "Nên đi đo thính lực lâm sàng tại chuyên khoa Tai-Mũi-Họng để kiểm tra dẫn truyền khí và xương."
        }
    ]
}

def retrieve_graph_context(audiogram_db: Dict[str, int]) -> str:
    """Truy xuất các Node từ Đồ thị Tri thức dựa trên ngưỡng nghe hiện tại của người dùng."""
    high_avg = (audiogram_db["2000"] + audiogram_db["4000"] + audiogram_db["8000"]) / 3.0
    low_avg = (audiogram_db["250"] + audiogram_db["500"] + audiogram_db["1000"]) / 3.0

    context_blocks = [f"Chỉ số trung bình tần số trầm-trung: {low_avg:.1f} dB HL | Tần số cao: {high_avg:.1f} dB HL."]
    if high_avg > 30:
        node = AUDIOLOGY_KNOWLEDGE_GRAPH["nodes"][0]
        context_blocks.append(
            f"[Graph Node: {node['id']}] Âm vị bị khuyết: {', '.join(node['phonemes_affected'])}. "
            f"Âm thanh khó nghe: {', '.join(node['sounds_affected'])}. "
            f"Triệu chứng: {node['symptoms']} Lời khuyên: {node['advice']}"
        )
    if low_avg > 30:
        node = AUDIOLOGY_KNOWLEDGE_GRAPH["nodes"][1]
        context_blocks.append(
            f"[Graph Node: {node['id']}] Âm vị bị ảnh hưởng: {', '.join(node['phonemes_affected'])}. "
            f"Lời khuyên: {node['advice']}"
        )
    return "\n".join(context_blocks)

def build_dr_bunny_system_prompt(audiogram_db: Dict[str, int]) -> str:
    graph_ctx = retrieve_graph_context(audiogram_db)
    return f"""Bạn là Bác sĩ Thỏ (Dr. Bunny), chuyên gia tư vấn thính học AI tận tâm, ấm áp.
Dữ liệu Đồ thị Tri thức (GraphRAG Context) của người dùng hiện tại:
{graph_ctx}

QUY TẮC BẮT BUỘC:
1. Chỉ dựa vào dữ liệu GraphRAG Context ở trên để giải thích cho người dùng hiểu vì sao họ bị mất chữ ở mục Simulator hoặc vì sao các icon trên biểu đồ Audiogram chuyển sang màu xám.
2. Tuyệt đối KHÔNG chẩn đoán bệnh lý khẳng định. Luôn nhấn mạnh đây là công cụ mô phỏng và sàng lọc tham khảo.
3. Giải thích ngắn gọn, dễ hiểu cho cả người lớn tuổi và con cháu trong gia đình."""