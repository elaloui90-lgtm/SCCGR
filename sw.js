const CACHE_NAME='sccgr-v3';

const APP_SHELL=[
  './',
  './index.html',
  './manifest.json',
  './logo.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(APP_SHELL))
      .catch(()=>{})
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(
        keys
          .filter(k=>k.startsWith('sccgr-') && k!==CACHE_NAME)
          .map(k=>caches.delete(k))
      )
    ).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const r=event.request;

  if(r.method!=='GET') return;

  const u=new URL(r.url);

  // لا نتدخل أبداً في طلبات Supabase أو أي موقع خارجي
  if(u.origin!==self.location.origin) return;

  // صفحات HTML: نحاول دائماً جلب النسخة الجديدة أولاً
  if(
    r.mode==='navigate' ||
    r.destination==='document' ||
    u.pathname.endsWith('/index.html')
  ){
    event.respondWith(
      fetch(r,{cache:'no-store'})
        .then(res=>{
          const copy=res.clone();

          caches.open(CACHE_NAME)
            .then(cache=>cache.put('./index.html',copy));

          return res;
        })
        .catch(()=>
          caches.match('./index.html')
            .then(x=>x || caches.match('./'))
        )
    );

    return;
  }

  // الملفات المحلية: استعمل الكاش أولاً
  // وحاول تحديثه من الإنترنت
  event.respondWith(
    caches.match(r).then(cached=>{
      const net=fetch(r)
        .then(res=>{
          if(res.ok){
            const copy=res.clone();

            caches.open(CACHE_NAME)
              .then(cache=>cache.put(r,copy));
          }

          return res;
        })
        .catch(()=>cached);

      return cached || net;
    })
  );
});
