// Mascot expression is a UI *state*, never an inference about the patient's emotions.
export const BUNNY_EMOTIONS = Object.freeze({
  welcome: { label: "Chào đón", brow: "raised", mouth: "smile" },
  explaining: { label: "Giải thích", brow: "neutral", mouth: "small" },
  supportive: { label: "Lắng nghe", brow: "soft", mouth: "smile" },
  careful: { label: "Thận trọng", brow: "flat", mouth: "small" },
  serious: { label: "Tình huống cần lưu ý", brow: "flat", mouth: "flat" },
  thinking: { label: "Đang xử lý", brow: "raised", mouth: "small" },
});
export function selectBunnyEmotion(message) {
  if (message?.risk === "urgent") return "serious";
  if (message?.emotion && BUNNY_EMOTIONS[message.emotion]) return message.emotion;
  return "explaining";
}
export function stripDecorativeEmoji(message) {
  return String(message ?? "")
    .replace(/(?:🐰|📴|👉|⚠️|✅|🩺|🎧|🔤|🛒|👨‍👩‍👧)\s*/gu, "")
    .trim();
}
