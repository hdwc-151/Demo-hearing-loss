// Dựng bản DEMO MỘT FILE HTML: toàn bộ ứng dụng (JS + CSS) nằm trong một file, mở bằng file:// hoặc đăng lên bất kỳ
// nơi nào cũng chạy, không cần máy chủ. Chế độ demo (VITE_DEMO=1, xem .env.demo) tắt mọi lời gọi mạng và dùng bộ máy
// trong máy (util/graphrag.js, util/noise.js).
// Dùng: npm run build:demo [đường-dẫn-ra]   (mặc định ../demo/index.html)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outDir = resolve(root, "dist-demo");
const target = resolve(process.argv[2] || resolve(root, "../demo/index.html"));

rmSync(outDir, { recursive: true, force: true });
// Demo HTML nhúng CSS/JS nội tuyến, vì vậy phải dùng asset base "/" riêng.
// GitHub Pages xây PWA với VITE_BASE="/<repo>/"; không để base đó rò sang bước đóng gói demo.
execFileSync("npx", ["vite", "build", "--mode", "demo", "--outDir", "dist-demo", "--emptyOutDir"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, VITE_BASE: "/" },
});

let html = readFileSync(resolve(outDir, "index.html"), "utf8");
const read = (url) => readFileSync(resolve(outDir, url.replace(/^\.?\//, "")), "utf8");

// CSS -> <style>
html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, url) => `<style>\n${read(url)}\n</style>`);
// JS -> <script type="module"> cuối body (tránh làm sớm hơn #root); thoát </script và <!-- trong mã
let js = "";
html = html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>\s*/g, (_, url) => { js = read(url); return ""; });
if (!js) throw new Error("không tìm thấy thẻ script của bản build");
js = js.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
// Dùng hàm thay thế: chuỗi thay thế thường sẽ diễn giải "$&", "$'", "$$" có trong mã đã nén và làm hỏng file.
html = html.replace("</body>", () => `<script type="module">\n${js}\n</script>\n</body>`);
// Bản demo là một file duy nhất: bỏ liên kết tới manifest và biểu tượng (không có file đi kèm, tránh yêu cầu thừa)
html = html.replace(/<link rel="(?:manifest|apple-touch-icon)"[^>]*>\s*/g, "");
html = html.replace(/<title>.*?<\/title>/, "<title>Dr. Bunny — Demo (chạy trong trình duyệt)</title>");
html = html.replace("<head>", '<head>\n    <meta name="description" content="Dr. Bunny: mô phỏng trải nghiệm nghe kém. Bản demo chạy hoàn toàn trong trình duyệt." />');

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, html);
rmSync(outDir, { recursive: true, force: true });
console.log(`ĐÃ GHI ${target} (${(html.length / 1024).toFixed(0)} KB, một file duy nhất)`);
