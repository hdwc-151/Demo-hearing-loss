import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/",            // GitHub Pages cần "/<tên-repo>/"
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: {
    port: 5173,
    // /api/... -> backend :8000 (bỏ tiền tố /api). Chỉ áp dụng khi chạy `vite dev`.
    proxy: { "/api": { target: "http://localhost:8000", changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, "") } },
  },
  // Một file JS duy nhất: cần cho bản demo một file HTML, và gọn hơn cho app Capacitor.
  build: { rollupOptions: { output: { inlineDynamicImports: true } } },
});
