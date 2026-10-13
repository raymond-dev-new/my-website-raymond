const BASE_URL = "https://raymonddomain.dev";
window.UploadManager = {
  uploadWithProgress(formData, token, onProgress){
    return new Promise((resolve, reject)=>{
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/api/posts`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e)=>{
        if(e.lengthComputable){
          const p = Math.round((e.loaded/e.total)*100);
          if(onProgress) onProgress(p);
        }
      };
      xhr.onload = ()=>{
        if(xhr.status>=200 && xhr.status<300){
          try{ resolve(JSON.parse(xhr.responseText)); }catch{ resolve(xhr.responseText); }
        } else {
          reject(new Error(xhr.responseText || `Failed ${xhr.status}`));
        }
      };
      xhr.onerror = ()=>reject(new Error('Network error'));
      xhr.send(formData);
    });
  }
};