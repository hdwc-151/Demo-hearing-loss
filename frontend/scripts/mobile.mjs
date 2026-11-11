import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function mobilePlan(action, platform, host = process.platform) {
  if (!["build", "sync", "open", "run", "debug", "test"].includes(action)) throw new Error("Unknown mobile action");
  if (action !== "build" && !["android", "ios"].includes(platform)) {
    throw new Error("Choose android or ios, e.g. npm run cap:sync -- android");
  }
  if (platform === "ios" && host !== "darwin") throw new Error("iOS requires macOS with Xcode 26+; use the GitHub iOS Simulator workflow on Windows/Linux.");
  if (action === "test" && platform !== "android") throw new Error("Use debug ios to compile the Simulator; device acceptance is manual.");

  // Process env takes precedence over .env files. Never package a Pages prefix or a dev server URL.
  const env = { VITE_BASE: "/", VITE_API_BASE: "offline", VITE_DEMO: "0" };
  const steps = [{ tool: "vite", args: ["build"], env }];
  if (action !== "build") steps.push({ tool: "cap", args: ["sync", platform] });
  if (["open", "run"].includes(action)) steps.push({ tool: "cap", args: [action, platform] });
  if (["debug", "test"].includes(action) && platform === "android") {
    steps.push({ tool: "gradle", args: action === "test" ? ["testDebugUnitTest", "lintDebug"] : ["assembleDebug"] });
  }
  if (action === "debug" && platform === "ios") {
    steps.push({ tool: "xcodebuild", args: ["-project", "ios/App/App.xcodeproj", "-scheme", "App", "-configuration", "Debug",
      "-sdk", "iphonesimulator", "-destination", "generic/platform=iOS Simulator", "-derivedDataPath", "ios/DerivedData",
      "CODE_SIGNING_ALLOWED=NO", "build"] });
  }
  return steps;
}

export function runMobile(action, platform) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  for (const step of mobilePlan(action, platform)) {
    let command = process.execPath;
    let args = step.args;
    let cwd = root;
    if (step.tool === "vite") args = [fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url)), ...args];
    else if (step.tool === "cap") args = [fileURLToPath(new URL("../node_modules/@capacitor/cli/bin/capacitor", import.meta.url)), ...args];
    else if (step.tool === "gradle") {
      cwd = fileURLToPath(new URL("../android/", import.meta.url));
      command = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "bash";
      args = process.platform === "win32" ? ["/d", "/c", "gradlew.bat", ...args] : ["./gradlew", ...args];
    } else command = "xcodebuild";
    console.log(`Mobile: ${step.tool} ${step.args.join(" ")}`);
    const result = spawnSync(command, args, { cwd, env: { ...process.env, ...step.env }, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${step.tool} failed (${result.status ?? result.signal})`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { runMobile(process.argv[2], process.argv[3]); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
