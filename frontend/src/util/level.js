// Chọn preset GẦN NHẤT với một audiogram tuỳ chỉnh (khoảng cách trung bình tuyệt đối, đơn vị dB).
// Simulator dùng hàm này để "nghe" được audiogram người dùng kéo thả; trước đây nó bỏ qua hoàn
// toàn và chỉ nhìn preset `level` (AUDIT-06). Hàm thuần, không phụ thuộc React nên test được bằng Node.
export function nearestLevel(thresholds, presets, order = Object.keys(presets)) {
  let best = order[0];
  let bestDist = Infinity;
  for (const lv of order) {
    const p = presets[lv];
    let sum = 0;
    for (let i = 0; i < p.length; i++) sum += Math.abs((thresholds[i] ?? 0) - p[i]);
    const dist = sum / p.length;
    if (dist < bestDist - 1e-9) {   // hoà khoảng cách -> giữ mức nhẹ hơn (đứng trước trong `order`)
      bestDist = dist;
      best = lv;
    }
  }
  return best;
}
