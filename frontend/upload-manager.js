// Global TikTok-style background uploader
const UploadManager = {
  start(file, caption, token) {
    const id = Date.now();
    localStorage.setItem('uploading', JSON.stringify({id, caption, progress:0, status:'compressing'}));
    this.showBar(0, 'Compressing...');
    return id;
  },
  showBar(progress, text){
    let bar = document.getElementById('global-upload-bar');
    if(!bar){
      bar = document.createElement('div');
      bar.id='global-upload-bar';
      bar.innerHTML=`<div style="position:fixed;bottom:0;left:0;right:0;background:#121212;border-top:1px solid #262626;padding:10px 16px;display:flex;align-items:center;gap:12px;z-index:9999;font-family:Arial">
        <div style="width:24px;height:24px;border:3px solid #333;border-top:3px solid #fff;border-radius:50%;animation:spin 1s linear infinite"></div>
        <div style="flex:1"><div id="utext" style="color:#fff;font-size:13px">${text}</div><div style="height:3px;background:#333;margin-top:6px;border-radius:2px"><div id="uprog" style="height:100%;background:#0095f6;width:${progress}%"></div></div></div>
        </div><style>@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}</style>`;
      document.body.appendChild(bar);
    } else {
      bar.style.display='flex';
    }
    const ut = document.getElementById('utext'); if(ut) ut.innerText=text;
    const up = document.getElementById('uprog'); if(up) up.style.width=progress+'%';
  },
  hideBar(){ const b=document.getElementById('global-upload-bar'); if(b) b.style.display='none'; localStorage.removeItem('uploading'); },
  uploadWithProgress(fd, token, onProgress){
    return new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();
      xhr.open('POST','https://raymonddomain.dev/api/posts');
      xhr.setRequestHeader('authorization',token);
      xhr.upload.onprogress=(e)=>{ if(e.lengthComputable){ const p=Math.round((e.loaded/e.total)*100); onProgress(p); } };
      xhr.onload=()=>{ if(xhr.status>=200 && xhr.status<300) resolve(xhr.responseText); else reject(new Error(xhr.responseText)); };
      xhr.onerror=()=>reject(new Error('Network error'));
      xhr.send(fd);
    });
  }
};

// Auto show bar if upload was in progress and user came to another page
(function(){
  const data=localStorage.getItem('uploading');
  if(data){
    const d=JSON.parse(data);
    UploadManager.showBar(d.progress||10, d.status||'Uploading in background...');
  }
})();