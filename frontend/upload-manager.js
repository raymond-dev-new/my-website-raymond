// upload-manager.js - FIXED - fast upload
const BASE_URL = "https://raymonddomain.dev";

window.UploadManager = {
  showBar(percent, text){
    const bar = document.getElementById('progressBar');
    const fill = document.getElementById('progressFill');
    if(bar) bar.style.display='block';
    if(fill) fill.style.width=percent+'%';
    if(text && document.getElementById('status')){
      document.getElementById('status').textContent=text;
    }
  },

  uploadWithProgress(formData, token, onProgress){
    return new Promise((resolve, reject)=>{
      const xhr = new XMLHttpRequest();
      
      // THIS IS THE FETCH URL SENDING TO BACKEND
      xhr.open('POST', `${BASE_URL}/api/posts`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e)=>{
        if(e.lengthComputable){
          const percent = Math.round((e.loaded / e.total) * 100);
          if(onProgress) onProgress(percent);
        }
      };

      xhr.onload = ()=>{
        if(xhr.status>=200 && xhr.status<300){
          try{ resolve(JSON.parse(xhr.responseText)); }
          catch{ resolve(xhr.responseText); }
        } else {
          reject(new Error(xhr.responseText || `Upload failed ${xhr.status}`));
        }
      };

      xhr.onerror = ()=>reject(new Error('Network error - check internet'));
      xhr.send(formData);
    });
  }
};