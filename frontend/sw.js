self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => self.clients.claim());

const CACHE='wr-images-v1';
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.pathname.startsWith('/api/')) return; // NEVER cache API
  if(e.request.destination==='image'){
    e.respondWith(caches.open(CACHE).then(async c=>{
      const hit=await c.match(e.request);
      if(hit) return hit;
      try{ const res=await fetch(e.request); if(res.ok) c.put(e.request,res.clone()); return res; }catch(err){ return hit||fetch(e.request); }
    }));
  }
});