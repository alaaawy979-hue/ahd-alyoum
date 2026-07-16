/* عهد اليوم — Service Worker: يعمل دون اتصال + يجلب أحدث نسخة عند وجود النت */
const CACHE = "ahd-alyoum-v16";
const ASSETS = ["./", "./index.html", "./sw.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// عند الضغط على الإشعار: افتح التطبيق أو ركّز عليه
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow("./index.html");
    })
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const accept = req.headers.get("accept") || "";
  const isPage = req.mode === "navigate" || accept.includes("text/html");

  if (isPage) {
    // الصفحة: الشبكة أولًا (أحدث نسخة عند وجود النت) ثم الكاش عند انقطاعه
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => { c.put("./index.html", copy); c.put("./", copy.clone()); }).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // باقي الملفات: الشبكة أولًا أيضًا لضمان التحديث، والكاش احتياطًا دون اتصال
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req))
  );
});
