import { BUNNY_EMOTIONS } from "../util/bunnyPersona.js";
// One compact, accessible SVG character. Do not insert emojis in the response body.
export default function BunnyAvatar({ emotion = "welcome", size = 40 }) {
  const state = BUNNY_EMOTIONS[emotion] || BUNNY_EMOTIONS.welcome;
  const flat = emotion === "serious";
  const brows = emotion === "thinking" || emotion === "welcome" ? 28 : 31;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={"Dr. Bunny — " + state.label}
      xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="64" height="64" rx="18" fill={flat ? "#F9E5DE" : "#E6F1E6"} />
      <path d="M19 28 C11 12 14 4 21 5 C29 7 29 18 29 27 M45 28 C53 12 50 4 43 5 C35 7 35 18 35 27"
        fill="#FFFFFF" stroke="#637B65" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M21 9 L25 22 M43 9 L39 22" stroke="#D5A5A5" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="32" cy="39" rx="23" ry="19" fill="#FFFFFF" stroke="#637B65" strokeWidth="2"/>
      <path d={"M20 "+brows+" L28 "+(brows-1)+" M36 "+(brows-1)+" L44 "+brows} stroke="#637B65" strokeWidth="1.8" strokeLinecap="round"/>
      <ellipse cx="24" cy="39" rx="2.3" ry="3" fill="#2D453A"/><ellipse cx="40" cy="39" rx="2.3" ry="3" fill="#2D453A"/>
      <path d="M29 45 Q32 49 35 45" stroke="#DA9191" strokeWidth="2.5" fill="none"/>
      <path d={flat ? "M27 51 L37 51" : emotion === "welcome" || emotion === "supportive" ? "M26 49 Q32 57 38 49" : "M29 51 Q32 53 35 51"}
        fill="none" stroke="#597563" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}
