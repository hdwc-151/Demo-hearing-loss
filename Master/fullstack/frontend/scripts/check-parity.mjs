// Kiểm parity: phoneme.js phải cho cùng kết quả với engine Python (fixture sinh bởi tests/make_fixtures.py).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { degradeTokens } from "../src/util/phoneme.js";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(resolve(here, "../../tests/fixtures/phoneme_vi.json"), "utf8"));

let fail = 0;
for (const c of fx.cases) {
  const got = degradeTokens(c.text, c.level, "vi", c.dialect)
    .map((t) => (t.cls === "hide" ? " ".repeat(t.t.length) : t.t))
    .join("");
  if (got !== c.expected) {
    fail++;
    if (fail <= 5) console.error("MISMATCH", JSON.stringify({ text: c.text, level: c.level, dialect: c.dialect }),
      "\n  want:", JSON.stringify(c.expected), "\n  got: ", JSON.stringify(got));
  }
}
const ok = fx.cases.length - fail;
console.log(`parity: ${ok}/${fx.cases.length} khớp`);
process.exit(fail ? 1 : 0);
