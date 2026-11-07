// Shared cache helper - IndexedDB
const WRDB = {
  dbName: 'WildReadersDB', storeName: 'cache',
  _open(){ return new Promise((res,rej)=>{ const r=indexedDB.open(this.dbName,1); r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains(this.storeName)) r.result.createObjectStore(this.storeName); }; r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); },
  async save(k,d){ try{ const db=await this._open(); return new Promise(r=>{ const t=db.transaction(this.storeName,'readwrite'); t.objectStore(this.storeName).put({data:d,time:Date.now()},k); t.oncomplete=()=>r(true); t.onerror=()=>r(false); }); }catch(e){ return false; } },
  async get(k){ try{ const db=await this._open(); return new Promise(r=>{ const t=db.transaction(this.storeName,'readonly'); const q=t.objectStore(this.storeName).get(k); q.onsuccess=()=>r(q.result?q.result.data:null); q.onerror=()=>r(null); }); }catch(e){ return null; } }
};