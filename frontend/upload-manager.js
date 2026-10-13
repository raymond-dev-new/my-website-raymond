const UploadManager = {
  showBar(progress, text){
    let bar = document.getElementById('global-upload-bar');
    if(!bar){
      bar = document.createElement('div');
      bar.id='global-upload-bar';
      bar.innerHTML=`<div style="position:fixed;top:0;left:0;right:0;background:#121212;border-bottom:1px solid #262626;padding:12px 16px;display:flex;align-items:center;gap:12px;z-index:99999;font-family:Arial">
        <div style="width:22px;height:22px;border:3px solid #333;border-top:3px solid #fff;border-radius:50%;animation:spin 1s linear infinite;flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div id="utext" style="color:#fff;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>
          <div style="height:3px;background:#333;margin-top:6px;border-radius:2px;overflow:hidden">
            <div id="uprog" style="height:100%;background:#0095f6;width:0%;transition:width 0.3s"></div>
          </div>
        </div>
      </div>
      <style>@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}</style>`;
      document.body.appendChild(bar);
      // push content down so top bar doesn't cover header
      document.body.style.paddingTop = '55px';
    }
    document.getElementById('utext').innerText=text;
    document.getElementById('uprog').style.width=progress+'%';
    bar.style.display='block';
  },
  hideBar(){ 
    const b=document.getElementById('global-upload-bar'); 
    if(b) b.remove(); 
    document.body.style.paddingTop='0px';
    localStorage.removeItem('uploading'); 
  },
  uploadWithProgress(fd, token, onProgress){
    return new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();
      xhr.open('POST','https://raymonddomain.dev/api/posts');
      xhr.setRequestHeader('authorization',token);
      xhr.upload.onprogress=(e)=>{ if(e.lengthComputable){ onProgress(Math.round((e.loaded/e.total)*100)); } };
      xhr.onload=()=>{ if(xhr.status>=200 && xhr.status<300) resolve(xhr.responseText); else reject(new Error(xhr.responseText)); };
      xhr.onerror=()=>reject(new Error('Network'));
      xhr.send(fd);
    });
  }
};