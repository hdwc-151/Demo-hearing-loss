import re

def degrade_text_by_hearing_loss(text: str, level: str) -> str:
    """
    Mô phỏng trực quan sự biến mất của các âm vị (phonemes) theo mức độ suy giảm thính lực.
    
    level: 'Normal' | 'Mild' | 'Moderate' | 'Severe'
    
    Giữ nguyên vị trí khoảng trắng (blank space) để người đọc thấy chữ bị 'khuyết'.
    """
    if level == "Normal":
        return text

    # 1. Mức MILD (Mất tần số cao 4000-8000Hz: các âm xát nhẹ 'th', 'sh', 'ph', 's', 'f', 'z', 'x')
    mild_digraphs = [r'th', r'sh', r'ph', r'kh']
    mild_chars = set("sfzxvSFZXV")

    # 2. Mức MODERATE (Mất thêm tần số trung-cao 1500-4000Hz: 'ch', 'tr', 'gh', 't', 'k', 'c', 'p', 'g', 'd', 'h', 'b')
    moderate_digraphs = [r'ch', r'tr', r'gh', r'ght']
    moderate_chars = set("tkcpgdhbđqTKCPGDHBĐQ")

    # 3. Mức SEVERE (Mất thêm các phụ âm mũi/lỏng, chỉ còn nguyên âm rời rạc)
    severe_chars = set("mnlrwjyMNLRWJY0123456789")

    result = text

    # Xử lý cụm phụ âm ghép (Digraphs) trước bằng cách thay bằng khoảng trắng tương ứng độ dài
    if level in ["Mild", "Moderate", "Severe"]:
        for pattern in mild_digraphs:
            result = re.sub(pattern, lambda m: " " * len(m.group(0)), result, flags=re.IGNORECASE)

    if level in ["Moderate", "Severe"]:
        for pattern in moderate_digraphs:
            result = re.sub(pattern, lambda m: " " * len(m.group(0)), result, flags=re.IGNORECASE)

    # Xử lý từng ký tự đơn
    output_chars = []
    for ch in result:
        if level == "Mild" and ch in mild_chars:
            output_chars.append(" ")
        elif level == "Moderate" and (ch in mild_chars or ch in moderate_chars):
            output_chars.append(" ")
        elif level == "Severe" and (ch in mild_chars or ch in moderate_chars or ch in severe_chars):
            output_chars.append(" ")
        else:
            output_chars.append(ch)

    return "".join(output_chars)


# --- TEST THỬ VỚI ĐOẠN HỘI THOẠI TRONG ẢNH 8, 9, 10 & TIẾNG VIỆT ---
sample_en = "Alright, you're all set. Your total is $27.60. Is that going to be... card, or?"
sample_vi = "Bố ơi hôm nay nhà mình đi siêu thị mua cá thu và thịt bò nhé?"

for lvl in ["Normal", "Mild", "Moderate", "Severe"]:
    print(f"=== MỨC ĐỘ: {lvl.upper()} ===")
    print("EN:", degrade_text_by_hearing_loss(sample_en, lvl))
    print("VI:", degrade_text_by_hearing_loss(sample_vi, lvl))
    print()