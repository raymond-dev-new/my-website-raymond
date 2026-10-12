self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => self.clients.claim());

self.addEventListener('push', function(e){
  let data = {title:'RAyMoNd', body:'New message'};
  try{ if(e.data) data = e.data.json(); }catch{}
  self.registration.showNotification(data.title || 'RAyMoNd', {
    body: data.body || 'You have a new message',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200,100,200],
    tag: 'chat-msg'
  });
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window'}).then(list=>{
      if(list.length) return list[0].focus();
      return clients.openWindow('/messages.html');
    })
  );
});