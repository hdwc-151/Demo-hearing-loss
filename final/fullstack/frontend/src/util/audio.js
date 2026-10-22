// Một AudioContext dùng chung cho toàn app (Simulator + tone mẫu của Audiogram).
// Trình duyệt giới hạn số AudioContext đồng thời; tạo mới mỗi lần sẽ rò rỉ tài nguyên.
let ctx = null;

export function getAudioCtx() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    ctx = new C();
  }
  return ctx;
}

export function peekAudioCtx() {
  return ctx; // null nếu chưa từng phát âm thanh
}
