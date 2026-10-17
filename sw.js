// 상하이 여행 앱 오프라인 지원
// 앱 화면(HTML)은 인터넷이 되면 항상 최신으로 받고, 안 되면 저장본을 보여줍니다.
const APP = "sh-app-202610172237";
const TILES = "sh-tiles-v1";
const IMGS = "sh-img-v1";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== APP && k !== TILES && k !== IMGS).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 앱 파일: 네트워크 우선 → 실패하면 저장본
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(APP).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match("index.html")))
    );
    return;
  }

  // 고덕지도 지도 그림: 본 적 있는 부분은 저장해 두고 오프라인에서도 보여줌
  if (/autonavi\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.open(TILES).then(c => c.match(req).then(hit => {
        const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
  }
  // 맛집 대표 음식 사진(위키미디어): 한 번 본 사진은 저장해서 오프라인·중국에서도 보이게
  if (/(^|\.)wikimedia\.org$/.test(url.hostname)) {
    e.respondWith(
      caches.open(IMGS).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; })))
    );
    return;
  }
  // 날씨 등 나머지는 그대로 (앱 안에서 마지막 날씨를 따로 저장함)
});
