import test from "node:test";
import assert from "node:assert/strict";
import { onBackground } from "../src/native.js";

test("unmount before the native listener resolves removes it and suppresses stale callbacks", async () => {
  let resolveListener, nativeCallback, removed = 0, stopped = 0;
  const doc = new EventTarget();
  doc.hidden = true;
  const app = { addListener: (_event, cb) => {
    nativeCallback = cb;
    return new Promise(resolve => { resolveListener = resolve; });
  } };
  const dispose = onBackground(() => stopped++, { doc, native: true, app });
  doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(stopped, 1);
  dispose();
  resolveListener({ remove: () => { removed++; } });
  await Promise.resolve();
  nativeCallback({ isActive: false });
  doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(removed, 1);
  assert.equal(stopped, 1);
  dispose();
  assert.equal(removed, 1);
});
