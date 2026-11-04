import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { degradeText } from "../src/util/phoneme.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "../../tests/fixtures/phoneme_vi.json");
const data = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

let failed = 0;
for (const c of data.cases) {
  const got = degradeText(c.text, c.level, "vi", c.dialect);
  if (got !== c.expected) {
    failed++;
    console.error(`MISMATCH [${c.level}/${c.dialect}]`);
  }
}
if (failed > 0) process.exit(1);
console.log(`PASS: ${data.cases.length}/${data.cases.length} JS <-> Python phoneme parity cases matched`);
