KNOWLEDGE_GRAPH_AUDIOLOGY = {
    "nodes": {
        "FREQ_HIGH": {
            "range_hz": [2000, 8000],
            "lost_phonemes": ["s", "x", "f", "ph", "th", "ch", "tr", "t", "k"],
            "lost_sounds": ["Tiếng chim hót", "Tiếng trẻ em/phụ nữ nói", "Tiếng còi báo thức", "Tiếng thì thầm"],
            "clinical_meaning": "Suy giảm thính lực tần số cao (thường gặp ở lão thính hoặc tiếp xúc tiếng ồn)."
        },
        "SCENARIO_RESTAURANT_SHOPPING": {
            "pain_point": "Nghe thấy người đối diện đang mấp máy môi và có âm thanh phát ra, nhưng chữ bị mất phụ âm đầu/cuối gây đoán mò mệt mỏi (Listening Fatigue).",
            "communication_tips": [
                "Nhìn thẳng vào mặt người nghe để họ kết hợp đọc khẩu hình môi.",
                "Không cần hét to (vì nguyên âm tần số thấp họ vẫn nghe bình thường, hét to gây chói tai - Loudness Recruitment), hãy nói chậm và rõ từng chữ.",
                "Giảm tiếng ồn nền hoặc chọn góc ngồi quay lưng vào tường."
            ]
        }
    },
    "predefined_qa_templates": [
        {
            "question_id": "q1",
            "button_label": "📊 Phân tích biểu đồ thính lực tôi vừa kéo",
            "dynamic_answer_fn": lambda avg_low_db, avg_high_db: (
                f"🐰 **Bác sĩ Thỏ phân tích biểu đồ của bạn:**\n"
                f"- Ở vùng âm trầm (250-1000Hz), ngưỡng nghe của bạn khoảng **{avg_low_db} dB**.\n"
                f"- Ở vùng âm cao (2000-8000Hz), ngưỡng nghe đang ở mức **{avg_high_db} dB**.\n"
                + ("👉 Bạn vẫn nghe rõ tiếng xe cộ, tiếng chó sủa, nhưng các âm thanh tinh tế như **tiếng chim hót, tiếng thì thầm** và các chữ cái **s, th, f, t** đã bị mờ đi trên biểu đồ. Đây là lý do khi đi siêu thị (Shopping) hay nhà hàng (Restaurant), bạn dễ nghe nhầm từ!"
                   if avg_high_db > 35 else
                   "👉 Tuyệt vời! Đường biểu diễn của bạn nằm hoàn toàn phía trên hầu hết các âm thanh đời thường, bạn có thể nghe rõ từ tiếng lá xào xạc đến cuộc trò chuyện nhỏ.")
            )
        },
        {
            "question_id": "q2",
            "button_label": "🛒 Tại sao ở siêu thị/đám đông tôi nghe được tiếng nhưng không hiểu chữ?",
            "static_answer": (
                "🐰 **Giải thích từ Góc độ Thính học:**\n"
                "Ngôn ngữ gồm 2 phần: **Nguyên âm (a, o, e)** mang năng lượng lớn ở tần số thấp và **Phụ âm (s, t, k, ch)** mang năng lượng rất nhỏ ở tần số cao.\n\n"
                "Khi có tiếng ồn nền (như ở Siêu thị hoặc Nhà hàng), tiếng ồn sẽ nuốt chửng các phụ âm tần số cao. Tai bạn vẫn bắt được nguyên âm nên **biết có người đang nói**, nhưng vì mất phụ âm nên não bộ phải căng sức 'điền vào chỗ trống' (giống như các chữ bị khuyết ở Tab Simulator), dẫn đến nghe nhầm!"
            )
        }
    ]
}