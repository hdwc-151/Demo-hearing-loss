import test from "node:test";
import assert from "node:assert/strict";
import { mobilePlan } from "./mobile.mjs";

test("Android builds never need the iOS toolchain and always rebuild packaged assets", () => {
  const steps = mobilePlan("debug", "android", "win32");
  assert.deepEqual(steps.map(s => s.tool), ["vite", "cap", "gradle"]);
  assert.deepEqual(steps[0].env, { VITE_BASE: "/", VITE_API_BASE: "offline", VITE_DEMO: "0" });
  assert.deepEqual(steps[1].args, ["sync", "android"]);
  assert.deepEqual(steps[2].args, ["assembleDebug"]);
});

test("iOS commands reject unsupported hosts before building or syncing files", () => {
  for (const action of ["sync", "open", "run", "debug"]) {
    for (const host of ["win32", "linux"]) assert.throws(() => mobilePlan(action, "ios", host), /macOS/);
  }
  const steps = mobilePlan("debug", "ios", "darwin");
  assert.deepEqual(steps[1].args, ["sync", "ios"]);
  assert.ok(steps[2].args.includes("CODE_SIGNING_ALLOWED=NO"));
  assert.ok(steps[2].args.includes("iphonesimulator"));
});

test("device run, native validation and ambiguous invocations use explicit targets", () => {
  assert.deepEqual(mobilePlan("run", "android").at(-1).args, ["run", "android"]);
  assert.deepEqual(mobilePlan("test", "android").at(-1).args, ["testDebugUnitTest", "lintDebug"]);
  assert.throws(() => mobilePlan("sync"), /Choose android or ios/);
  assert.throws(() => mobilePlan("shell", "android"), /Unknown/);
});
