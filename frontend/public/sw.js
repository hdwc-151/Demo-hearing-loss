// Service worker tối giản cho PWA: lưu vỏ ứng dụng để mở được khi không có mạng. Ứng dụng tự đủ chức năng offline
// nhờ bộ máy chạy trong máy (util/phoneme.js, graphrag.js, noise.js), nên chỉ cần cache các file tĩnh.
// Lời gọi API (/api/...) và mọi yêu cầu khác origin đi thẳng ra mạng, không bao giờ bị cache ở đây.
const CACHE = "drbunny-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.includes("/api/")) return;
  if (req.mode === "navigate") {                       // trang: ưu tiên mạng, mất mạng thì dùng bản đã lưu
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copy)); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {   // file tĩnh (JS/CSS có băm tên): ưu tiên cache
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return r;
  })));
});
