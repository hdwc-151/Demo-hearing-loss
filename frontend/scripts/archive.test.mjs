import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const releases = [
  ["2026-11-04-classic-offline-demo.html", "21f3259ea49f9df7e5dc2f79a4e0d4ade1b2030b", 215592],
  ["2026-11-04-v0.3-single-file-demo.html", "7746a18f1ccab343c4a002cf8a2b45b7010e555c", 217524],
];
test("immutable demos retain exact historical Git blob SHA and bytes", () => {
  const blobs = [];
  for (const [file, expectedSha, bytes] of releases) {
    const buffer = readFileSync(new URL("../../archive/demos/" + file, import.meta.url));
    assert.equal(buffer.length, bytes);
    const sha = createHash("sha1").update(Buffer.from("blob " + buffer.length + "\0")).update(buffer).digest("hex");
    assert.equal(sha, expectedSha, file);
    assert.match(buffer.toString("utf8", 0, 5000), /<html|<!doctype/i);
    blobs.push(sha);
  }
  assert.notEqual(blobs[0], blobs[1]);
});
