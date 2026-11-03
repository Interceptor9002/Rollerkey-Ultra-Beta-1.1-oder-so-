const CACHE = "rollerkey-v2";
const SHELL = ["./", "./index.html"];
const CDN = /jsdelivr|js\.stripe\.com/;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === location.origin){
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && res.ok){
          const c = await caches.open(CACHE);
          c.put(req, res.clone());
        }
        return res;
      } catch(_){
        return (await caches.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  if (CDN.test(url.host)){
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit){
        fetch(req).then(r => {
          if (r && r.ok) caches.open(CACHE).then(c => c.put(req, r));
        }).catch(() => {});
        return hit;
      }
      try {
        const res = await fetch(req);
        if (res && res.ok){
          const c = await caches.open(CACHE);
          c.put(req, res.clone());
        }
        return res;
      } catch(_){ return Response.error() }
    })());
  }
});