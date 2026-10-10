import express from 'express'
import dotenv from 'dotenv'
dotenv.config()
import { fileURLToPath } from 'url'
// Recreate __dirname for ESM

import mongoose from 'mongoose'
import user from './model/user.js';
// import mongodb from './model/schema.js';
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import path from 'path'
import bordyparser from 'body-parser'
import axios from 'axios'
import multer from 'multer'
import fs from 'fs'
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import {v2 as cloudinary } from 'cloudinary';
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import cron from "node-cron"
import fetch from "node-fetch"; // npm i node-fetch
//import { handleUpload } from '@vercel/blob/client';
//import { del } from '@vercel/blob';



const app = express()

//Raymond123
const port = process.env.PORT || 8000
const JWT_SECRET = process.env.JWT_SECRET
const JWT_SECRETT = 'jhgfdghjkhytredfgjhkjhgjfhdgsHJJHDKJHRHJERKJhkgjhjbknhghfdgjhkjkh'
const url = process.env.MONGO_URL


app.use(cors({ origin: "*" }));
app.use(bordyparser.json()); // for metadata
app.use(express.json({ limit: '50mb' })); // important for base64
 app.use(express.static(path.join(__dirname, 'frontend')))

  app.use((req, res, next) => {
    console.log(`  ${req.method}  ${req.url}`);
    next();
 })

 //start here sdfyuiopiuytrewrtyuiopoiuytretkjhgf

    // 1. CONNECT MONGODB with Mongoose
mongoose.connect(url)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));
 

  let token = '';

 let User = '';


  app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'mainpage.html'));
 }) 

 app.post('/change', async (req, res) => {
   
   const { token, newPassword } = req.body
    
    if(!newPassword) {
       return res.json({status: 'error', error: 'Invalid password'})

     }  else if(newPassword.length <= 5) {
       return res.json({status: 'error', error: 'password should be at least 6 character'})
    }  

   try{
   const Userr = jwt.verify(token, JWT_SECRET)
    //console.log(Userr)
 
    const password = await bcrypt.hash(newPassword, 10)
   const email = Userr.email
   await user.updateOne(
    { email }, 
          {
             $set:  { password }
          }
   )

    res.json({status: 'ok'})

   }catch(err) {
    console.log(err)
    res.json({ status: 'error', error: 'failed' })
   }
 })
  

 app.post('/login', async (req, res) => {
  console.log(req.body)
  const {name, email, password} = req.body

     User = await user.findOne({email}).lean()
     //console.log(User)
   
   if(!User) {
    return res.json({status: 'error', error: 'Invalid username/password'})
   }
    
    const bcryptcheck = await bcrypt.compare(password, User.password)

   
    if(!bcryptcheck) {  
        return res.json({status: 'error', error: 'invalid password'})
    } 

    token = jwt.sign({ 
        email: User.email, 
        userid: User.name
        }, JWT_SECRET )
   

   res.json({status:'ok', data: token, Name: name })
}) 

 
app.post('/register', async (req, res) => {
   console.log(req.body)
   const {name, email, passwords} = req.body

    if(!name || typeof name !== 'string') {
       return res.send({status: 'error', error: 'Invalid username'})

    } else if(!email) {
       return res.send({status: 'error', error: 'Invalid email'})
    }

     if(!passwords) {
       return res.send({status: 'error', error: 'Invalid password'})
     } 
     if(passwords.length <= 4) {
       return res.send('password should be at least 6 character')
    }


   const password = await bcrypt.hash(passwords, 10)

   try {
   const response = await user.create({
      name,
      email,
      password
    })

    console.log('users created successfully', response)

   } catch(err) {
     if(err.code === 11000) {
       return res.send({status: 'error', error: 'Username already in use'})
     }
     throw err  
   }

   res.json({status:'ok'})
})

  

app.get('/get', (req, res) => {

  res.json({status: 'ok', data: 'Selection', input: 'input'})
})

  
app.post('/create', (req, res) => {
  console.log(req.body)
  const {select} = req.body

  res.json({status: 'ok', data: select, input: 'input'})
})


    

app.post('/payment', async (req, res) => {
  console.log(req.body)
  const { price, email} = req.body

  try{

   const url = 'https://api.paystack.co/transaction/initialize';
  
      const response = await axios.post(url, {
        email, 
        amount: price * 100,
        currency: 'NGN',
        Callback_url: 'https://my-website-raymond.vercel.app/callback'
        },
       
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_KEY}`,
        },
      }
    )
    res.status(200).json(response.data)

  }catch(err) {
   
    console.log(err)
  }   
})


 app.post('webhook', express.json(), (req, res) => {
   const event = req.body;
 
   if(event.event === 'Charge.success') {
     console.log(event.data)
 
     const payment = event.data
   }
 
   res.status(200).json({success: true})
 }) 
 
  app.post('/recover', async (req, res) => {
    console.log(req.body)
    const {email, passwords} = req.body

   const Uuser = await user.findOne({email}).lean()
     console.log(Uuser)
   
   if(!Uuser) {
    return res.json({status: 'error', error: 'Incorrect email / please provide a register email'})
   }  
    
const password = await bcrypt.hash(passwords, 10)

  const emailuser = await user.updateOne(
    { email }, 
          {
             $set:  { password }
          }
   )
   
   res.json({status: 'ok'})
  })

  // start here kjhgfdsdfghioiuytdsdfghjklkjhgfdsdfgh


// 2. SCHEMA - note belongs to userId
const NoteSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Note = mongoose.model('Note', NoteSchema);

// 3. AUTH MIDDLEWARE - gets userId from token
function auth(req, res, next){
  const token = req.headers['authorization']?.split(' ')[1];
  if(!token) return res.status(401).json({error: 'Login required'});
  try {
    const decoded = jwt.verify(token, JWT_SECRETT);
    req.userId = decoded.id;
    next();
  } catch(e){ return res.status(401).json({error: 'Invalid token'}); }
}

// 4. FAKE LOGIN - for demo. Replace with real login later
// Send any email and you get a token. That token = your account
app.post('/api/login', (req,res) => {
  const {email} = req.body;
  if(!email) return res.status(400).json({error: "Email required"});
  const token = jwt.sign({id: email}, JWT_SECRETT); // use email as userId
  res.json({token});
});

// 5. ROUTES

// GET all notes for this user
app.get('/api/notes', auth, async (req,res) => {
  const notes = await Note.find({userId: req.userId}).sort({createdAt: -1});
  res.json(notes);
});

// CREATE note
app.post('/api/notes', auth, async (req,res) => {
  const {text} = req.body;
  if(!text) return res.status(400).json({error: "Text required"});
  const note = await Note.create({ userId: req.userId, text });
  res.json(note);
});

// DELETE note
app.delete('/api/notes/:id', auth, async (req,res) => {
  await Note.deleteOne({_id: req.params.id, userId: req.userId});
  res.json({ok: true});
});


  // end here tretyuiouytryuiouytrtyuiouytryuiuytfgiu



// new oiufdfgyuiopoiuytrertyuiopoiuytfdfghjk

   // ========== CONFIG ==========
   //1f6245b3640a4f8dbdcd4ef044526b30
   
   const API_KEY="04dfe64c981e43e88c16b3fd4b0003bc"; // Your football-data.org free key - 10 req/min limit
const API_URL="https://api.football-data.org/v4";

// ========== ANTI-BAN SYSTEM - MAIN PROTECTION FOR 1000 USERS ==========

// isSyncing = Lock. If vercel cron triggers twice or 2 people hit /api/sync same time, only 1 sync runs.
// Without this, 2 syncs = 4 API calls at once = risk of 429.
let isSyncing=false;

// liveCache = MOST IMPORTANT ANTI-BAN.
// Football-data free limit = 10 requests per minute. If 1000 users open /api/live at same time:
// WITHOUT cache: 1000 API calls in 1 minute = you get banned instantly (429 error).
// WITH this cache: First user triggers 1 real API call, we save result + time. For next 60 seconds,
// we serve the saved result from server RAM to the other 999 users. So 1000 users = 1 API call/min = SAFE.
let liveCache={data:[], time:0};

// visitorCache = ANTI-SPAM for single IP.
// If 1 person refreshes page 20 times in 10 seconds, without this = 20 API calls.
// With this: same IP within 10 seconds gets cached data immediately.
let visitorCache=new Map();

// syncCache = PROTECTION FOR /api/sync - 2min cooldown so users can't spam sync and ban you.
let syncCache={time:0,data:null};

// ========== DATABASE MODEL ==========
// We save matches in MongoDB so we NEVER call football-data for normal page loads.
// Upcoming/Finished tabs read from this DB = 0 API calls = can handle unlimited users.
// FIXED: Added watDate field - saves Lagos date (YYYY-MM-DD) so 10th night games don't shift to 11th
const Match=mongoose.models.Match||mongoose.model("Match",new mongoose.Schema({
  _id:String,
  date:Date, // UTC date from API
  watDate:String, // FIXED: Lagos date string e.g. "2026-10-10" - this fixes today disappearing
  status:String,
  minute:Number,
  minuteText:String,
  league:String,
  home:{name:String,logo:String},
  away:{name:String,logo:String},
  homeScore:Number,
  awayScore:Number,
  updatedAt:Date
}));

// ========== HELPER: GET DATE STRING ==========
// Returns YYYY-MM-DD for today +/- n days. Used to ask football-data for range.
function getDate(n=0){
  let d=new Date();
  d.setDate(d.getDate()+n);
  return d.toISOString().split("T")[0];
}

// ========== HELPER: CALL FOOTBALL-DATA API ==========
async function api(endpoint,params={}){
  const url=new URL(API_URL+endpoint);
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  const r=await fetch(url,{headers:{"X-Auth-Token":API_KEY}});
  const data=await r.json();
  if(!r.ok)throw Error(data.message||"API Error");
  return data;
}

// ========== HELPER: FORMAT API DATA FOR OUR DB ==========
// FIXED: Now saves watDate = Lagos date so grouping in frontend uses Lagos date
function format(m){
  const utc=new Date(m.utcDate);
  // FIXED: Convert UTC to Lagos date string. Example: 2026-10-10T23:00Z was shifting to 11th. watDate fixes it.
  const watDate=utc.toLocaleDateString("en-CA",{timeZone:"Africa/Lagos"});
  return{
    _id:String(m.id),
    date:utc, // keep UTC for sorting
    watDate:watDate, // FIXED: keep Lagos YYYY-MM-DD for display grouping - fixes today issue
    status:m.status,
    minute:m.minute||null,
    minuteText:m.status==="IN_PLAY"?`${m.minute||0}'`:
      m.status==="PAUSED"?"HT":
      m.status==="FINISHED"?"FT":null,
    league:m.competition?.name,
    home:{
      name:m.homeTeam?.name,
      logo:`https://crests.football-data.org/${m.homeTeam.id}.png`
    },
    away:{
      name:m.awayTeam?.name,
      logo:`https://crests.football-data.org/${m.awayTeam.id}.png`
    },
    homeScore:m.score?.fullTime?.home??m.score?.halfTime?.home??null,
    awayScore:m.score?.fullTime?.away??m.score?.halfTime?.away??null,
    updatedAt:new Date()
  };
}

// ========== CORE: SYNC 9 DAYS BACK + 9 DAYS FRONT TO DB ==========
async function fullSyncToDB(){
  if(isSyncing)return{synced:0,total:0}; // Lock check
  isSyncing=true;
  try{
    if(!process.env.MONGO_URL)throw Error("MONGO_URL missing in env vars");
    if(mongoose.connection.readyState!==1)
      await mongoose.connect(process.env.MONGO_URL);

    const past=await api("/matches",{
      dateFrom:getDate(-9),
      dateTo:getDate()
    });
    await new Promise(r=>setTimeout(r,6500)); // Wait 6.5 sec to avoid 10 req/min ban
    const future=await api("/matches",{
      dateFrom:getDate(1),
      dateTo:getDate(9)
    });
    const map=new Map();
    [...(past.matches||[]),...(future.matches||[])].forEach(m=>map.set(m.id,m));
    const formatted=[...map.values()].map(format);
    if(formatted.length){
      await Match.bulkWrite(
        formatted.map(m=>({
          updateOne:{
            filter:{_id:m._id},
            update:{$set:m},
            upsert:true
          }
        })),
        {ordered:false}
      );
    }
    return{synced:formatted.length,total:await Match.countDocuments()};
  }finally{
    isSyncing=false;
  }
}

// ========== CORE: GET MATCHES FROM DB - FIXED TODAY ISSUE ==========
async function getMatches(type){
  let filter={};
  const now = new Date();
  const startPast = new Date(); startPast.setDate(now.getDate() - 2); startPast.setHours(0,0,0,0);
  const endFuture = new Date(); endFuture.setDate(now.getDate() + 9); endFuture.setHours(23,59,59,999);
  const start9DaysAgo = new Date(); start9DaysAgo.setDate(now.getDate() - 9); start9DaysAgo.setHours(0,0,0,0);
  const endTomorrow = new Date(); endTomorrow.setDate(now.getDate() + 1); endTomorrow.setHours(23,59,59,999);

  if(type==="upcoming"){
    filter={ date:{$gte:startPast,$lte:endFuture}, status:{$in:["SCHEDULED","TIMED","IN_PLAY","LIVE","PAUSED"]} };
  }else{
    filter={ date:{$gte:start9DaysAgo,$lte:endTomorrow}, status:{$in:["FINISHED","AWARDED"]} };
  }
  const matches=await Match.find(filter).lean();
  if(type==="finished"){ return matches.sort((a,b)=>new Date(b.date)-new Date(a.date)); }
  return matches.sort((a,b)=>new Date(a.date)-new Date(b.date));
}

// ========== ROUTE 1: /api/matches ==========
app.get("/api/matches",async(req,res)=>{
  try{
    if(mongoose.connection.readyState!==1) await mongoose.connect(process.env.MONGO_URL);
    res.set("Cache-Control","no-store");
    const matches=await getMatches(req.query.tab||"upcoming");
    res.json({success:true,matches});
  }catch(e){ res.json({success:false,matches:[],error:e.message}); }
});

// ========== ROUTE 2: /api/live ==========
app.get("/api/live",async(req,res)=>{
  res.set("Cache-Control","no-store");
  try{
    const now=Date.now();
    const ip=req.headers["x-forwarded-for"]||req.ip;
    if(visitorCache.has(ip)&&now-visitorCache.get(ip)<10000){
      return res.json({success:true,matches:liveCache.data,cached:true});
    }
    visitorCache.set(ip,now);
    if(now-liveCache.time<60000&&liveCache.data.length>0){
      return res.json({success:true,matches:liveCache.data,cached:true});
    }
    const today=await api("/matches",{dateFrom:getDate(),dateTo:getDate()});
    const live=(today.matches||[]).filter(m=>["IN_PLAY","PAUSED","LIVE"].includes(m.status));
    const formatted=live.map(format);
    liveCache={data:formatted, time:now};
    res.json({success:true,matches:formatted,cached:false});
  }catch(e){
    if(liveCache.data.length>0){ return res.json({success:true,matches:liveCache.data,cached:true}); }
    res.json({success:false,matches:[],error:e.message});
  }
});

// ========== ROUTE 3: /api/sync ==========
app.get("/api/sync",async(req,res)=>{
  const now=Date.now();
  const COOLDOWN = 2*60*1000;
  try{
    if(mongoose.connection.readyState!==1) await mongoose.connect(process.env.MONGO_URL);
    if(now-syncCache.time<COOLDOWN && syncCache.data){
      return res.json({success:true,...syncCache.data,cached:true,message:"Sync cooldown 2min - RAM cached"});
    }
    const last = await Match.findOne().sort({updatedAt:-1});
    if(last && now - new Date(last.updatedAt).getTime() < COOLDOWN){
      return res.json({success:true,cached:true,total: await Match.countDocuments(),message:"Sync cooldown 2min - DB cached"});
    }
    if(isSyncing){ return res.json({success:false,cached:true,message:"Sync already running"}); }
    const r=await fullSyncToDB();
    syncCache={time:Date.now(),data:r};
    return res.json({success:true,...r,cached:false,timeWAT:new Date().toLocaleString("en-NG",{timeZone:"Africa/Lagos"}),message:`Synced ${r.synced} matches to DB`});
  }catch(e){ return res.json({success:false,error:e.message}); }
});

// matach end here kjhgfdghjkjhgfcghjkjhgf


// CONFIG
const API = process.env.API_FOOTBALL_KEY || '19ff9a571eb3c1a7bf5dc828fe578ffb';
const BASE = 'https://v3.football.api-sports.io';
const COOLDOWN = 2*60*60*1000; // 2 hours

// DB SCHEMAS
const countrySchema = new mongoose.Schema({
  fixture_id:{type:Number,unique:true}, home_team:String, away_team:String,
  home_logo:String, away_logo:String, league:String, league_logo:String,
  match_date:Date, status:String, elapsed:Number, score_home:Number, score_away:Number,
  last_updated:{type:Date,default:Date.now}
});
const CountryMatch = mongoose.models.CountryMatch || mongoose.model('CountryMatch', countrySchema);

const controlSchema = new mongoose.Schema({
  _id:{type:String,default:'country-api'}, lastFetch:{type:Date,default:new Date(0)}, lockedUntil:{type:Date,default:new Date(0)}
},{timestamps:true});
const FetchControl = mongoose.models.CountryFetchControl || mongoose.model('CountryFetchControl', controlSchema);

// STATUS
const LIVE = new Set(['1H','HT','2H','ET','BT','P','LIVE','INT']);
const DONE = new Set(['FT','AET','PEN']);

// HELPERS
const day = (d,n) => { const x=new Date(d); x.setUTCDate(x.getUTCDate()+n); return x.toISOString().slice(0,10); };
const isCountry = (m) => {
  if(m.teams?.home?.national && m.teams?.away?.national) return true;
  const n=(m.league?.name||'').toLowerCase();
  return ['world cup','euro','nations league','afcon','asian cup','copa america','concacaf','gold cup','oceania','international friendly','friendlies'].some(x=>n.includes(x));
};

// FIXED FOR FREE PLAN: fetch day-by-day (from/to not allowed on free)
async function getDays(from,to){
  const dates=[]; let cur=new Date(from); let end=new Date(to);
  while(cur<=end){ dates.push(cur.toISOString().slice(0,10)); cur.setUTCDate(cur.getUTCDate()+1); }
  
  let all=[];
  for(const d of dates){
    try{
      const r=await axios.get(`${BASE}/fixtures`,{
        params:{date:d}, // FREE plan uses date= not from/to
        headers:{'x-apisports-key':API},
        timeout:20000
      });
      console.log(`📅 ${d}: ${r.data?.results||0} matches`);
      if(r.data?.errors && Object.keys(r.data.errors).length) console.log('⚠️', r.data.errors);
      if(r.data?.response) all=all.concat(r.data.response);
      await new Promise(x=>setTimeout(x,650)); // avoid rate limit
    }catch(e){ console.log(`❌ ${d}:`, e.response?.data||e.message); }
  }
  return all;
}

async function reserveSlot(){
  const now=new Date();
  await FetchControl.updateOne({_id:'country-api'},{$setOnInsert:{lastFetch:new Date(0),lockedUntil:new Date(0)}},{upsert:true});
  const c=await FetchControl.findById('country-api').lean();
  if(!c) return {allowed:false,reason:'control unavailable'};
  if(c.lockedUntil && new Date(c.lockedUntil)>now) return {allowed:false,running:true,reason:'Fetch running'};
  const last=new Date(c.lastFetch||0);
  if(now-last < COOLDOWN) return {allowed:false,cooldown:true,lastFetch:last,nextAvailable:new Date(last.getTime()+COOLDOWN)};
  const locked=await FetchControl.findOneAndUpdate({_id:'country-api',lockedUntil:{$lte:now}},{$set:{lockedUntil:new Date(now.getTime()+30000)}},{new:true}).lean();
  if(!locked) return {allowed:false,running:true,reason:'Slot taken'};
  return {allowed:true,lastFetch:last};
}
async function recordFetch(){ await FetchControl.updateOne({_id:'country-api'},{$set:{lastFetch:new Date()}}); }
async function releaseLock(){ try{ await FetchControl.updateOne({_id:'country-api'},{$set:{lockedUntil:new Date(0)}}); }catch{} }

// MAIN SYNC: -3 to +3 days, 1 batch (7 API calls = 1 fetch per 4h)
async function fetchCountryMatches(){
  if(!API) return {total:0,saved:0,deleted:0,error:'API key missing'};
  if(mongoose.connection.readyState!==1) await mongoose.connect(process.env.MONGO_URL||process.env.MONGO_URI);
  
  const now=new Date(); now.setUTCHours(0,0,0,0);
  const from=day(now,-3), to=day(now,3);
  
  const list=await getDays(from,to); // all matches in 7 days
  const country=list.filter(isCountry);
  console.log(`📅 ${from}->${to}: ${list.length} total -> ${country.length} country`);

  if(country.length){
    await CountryMatch.bulkWrite(country.map(m=>({updateOne:{
      filter:{fixture_id:m.fixture.id},
      update:{$set:{
        fixture_id:m.fixture.id, home_team:m.teams.home.name, away_team:m.teams.away.name,
        home_logo:m.teams.home.logo||'', away_logo:m.teams.away.logo||'',
        league:m.league?.name||'International', league_logo:m.league?.logo||'',
        match_date:new Date(m.fixture.date), status:m.fixture.status?.short||'NS',
        elapsed:m.fixture.status?.elapsed??null, score_home:m.goals?.home??null, score_away:m.goals?.away??null,
        last_updated:new Date()
      }}, upsert:true
    }})),{ordered:false});
  }
  const start=new Date(now); start.setUTCDate(start.getUTCDate()-3);
  const end=new Date(now); end.setUTCDate(end.getUTCDate()+3); end.setUTCHours(23,59,59,999);
  const d=await CountryMatch.deleteMany({$or:[{match_date:{$lt:start}},{match_date:{$gt:end}}]});
  
  console.log(`✅ API:${list.length} Saved:${country.length} Deleted:${d.deletedCount}`);
  return {total:list.length,saved:country.length,deleted:d.deletedCount};
}

// API: DB ONLY - NO API CALL
app.get('/api/matches-country', async(req,res)=>{
  try{
    const tab=(req.query.tab||'upcoming').toLowerCase();
    const now=new Date(); now.setUTCHours(0,0,0,0);
    const start=new Date(now); start.setUTCDate(start.getUTCDate()-3);
    const end=new Date(now); end.setUTCDate(end.getUTCDate()+3); end.setUTCHours(23,59,59,999);
    let db=await CountryMatch.find({match_date:{$gte:start,$lte:end}}).lean();

    if(tab==='live') db=db.filter(m=>LIVE.has(m.status)).sort((a,b)=>new Date(b.match_date)-new Date(a.match_date));
    else if(['finished','recent','past'].includes(tab)) db=db.filter(m=>DONE.has(m.status)).sort((a,b)=>new Date(b.match_date)-new Date(a.match_date));
    else if(tab==='today'){ const tom=new Date(now); tom.setUTCDate(tom.getUTCDate()+1); db=db.filter(m=>{const d=new Date(m.match_date); return d>=now&&d<tom;}).sort((a,b)=>new Date(b.match_date)-new Date(a.match_date)); }
    else db=db.filter(m=>!DONE.has(m.status)).sort((a,b)=>{ const al=LIVE.has(a.status)?1:0, bl=LIVE.has(b.status)?1:0; if(bl!==al) return bl-al; return new Date(b.match_date)-new Date(a.match_date); }); // FIXED: recent at top

    res.json({success:true,count:db.length,matches:db.map(m=>({
      id:m.fixture_id, league:m.league, leagueLogo:m.league_logo, date:m.match_date,
      status:DONE.has(m.status)?'FINISHED':LIVE.has(m.status)?'IN_PLAY':'SCHEDULED',
      home:{name:m.home_team,logo:m.home_logo}, away:{name:m.away_team,logo:m.away_logo},
      homeScore:m.score_home, awayScore:m.score_away, elapsed:m.elapsed, rawStatus:m.status
    }))});
  }catch(e){ res.status(500).json({success:false,matches:[],error:e.message}); }
});

app.get('/api/country-matches', async(req,res)=>{
  try{
    const now=new Date(); now.setUTCHours(0,0,0,0);
    const s=new Date(now); s.setUTCDate(s.getUTCDate()-3);
    const e=new Date(now); e.setUTCDate(e.getUTCDate()+3); e.setUTCHours(23,59,59,999);
    res.json(await CountryMatch.find({match_date:{$gte:s,$lte:e}}).sort({match_date:-1}).lean());
  }catch(e){ res.status(500).json([]); }
});

// ONLY THIS ROUTE CALLS API - 4 HOUR COOLDOWN + FORCE RESET
// Normal:  localhost:8000/api/fetch-now
// Force:   localhost:8000/api/fetch-now?reset=1
app.get('/api/fetch-now', async(req,res)=>{
  req.setTimeout(30000);
  res.setHeader('Content-Type','application/json');
  let slot=null;
  try{
    const MONGO=process.env.MONGO_URI||process.env.MONGO_URL;
    if(!MONGO) return res.status(500).json({success:false,message:'MongoDB missing'});
    if(mongoose.connection.readyState!==1) await mongoose.connect(MONGO,{serverSelectionTimeoutMS:5000});

    if(req.query.reset==='1' || req.query.force==='true'){
      await FetchControl.deleteOne({_id:'country-api'});
      console.log('⚠️ COOLDOWN RESET - FORCED FETCH');
    }

    slot=await reserveSlot();
    if(!slot.allowed && slot.running) return res.json({success:false,cached:true,running:true,message:'Fetch already running.'});
    if(!slot.allowed && slot.cooldown){
      const ms=slot.nextAvailable-Date.now(), h=Math.floor(ms/3600000), m=Math.ceil((ms%3600000)/60000);
      return res.json({success:false,cached:true,cooldown:true,message:`Cooldown active. Try again in ${h}h ${m}m. Use ?reset=1 to force`,lastFetch:slot.lastFetch,nextAvailable:slot.nextAvailable,cooldownHours:2});
    }

    console.log('🚀 Fetching -3 to +3 days...');
    await recordFetch();
    const result=await fetchCountryMatches();
    await releaseLock();
    
    const count=await CountryMatch.countDocuments();
    return res.json({success:!result.error,message:result.error?'Fetch failed':'Fetch complete',synced:result.saved,apiTotal:result.total,deleted:result.deleted,totalInDB:count,cooldownHours:4,nextAvailable:new Date(Date.now()+COOLDOWN),time:new Date().toISOString()});
  }catch(e){
    await releaseLock();
    console.log('❌ fetch-now error:',e.message);
    return res.status(500).json({success:false,message:'Fetch failed',error:e.message,totalInDB:await CountryMatch.countDocuments().catch(()=>0)});
  }
});

// country match end here kjhgcfghhgxuygfxyf

//new ytresrtyuioiuytrertyuioiuytrertyu


// 1. SCHEMA: SAVE IMAGE AS BUFFER
const MediaSchema = new mongoose.Schema({
  userId: String,
  img: { data: Buffer, contentType: String }, // THIS SAVES THE FILE
  createdAt: { type: Date, default: Date.now }
});
const Media = mongoose.model('Media', MediaSchema);

// 2. MULTER: SAVE TO MEMORY
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 100 * 1024 * 1024 } });

// 3. UPLOAD ROUTE
app.post('/api/save-media', upload.single('file'), async (req, res) => {
  try {
    const { userId } = req.body;
    const newMedia = new Media({
      userId,
      img: {
        data: req.file.buffer, // raw bytes
        contentType: req.file.mimetype
      }
    });
    await newMedia.save();
    res.json({ success: true, id: newMedia._id });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET ROUTE - SEND AS BASE64
app.get('/api/get-media', async (req, res) => {
  const { userId } = req.query;
  const media = await Media.find({ userId }).sort({ createdAt: -1 });
  
  // Convert buffer to base64 so frontend can display
  const result = media.map(m => ({
    _id: m._id,
    src: `data:${m.img.contentType};base64,${m.img.data.toString('base64')}`
  }));
  res.json(result);
});

// 5. DELETE
app.delete('/api/delete-media/:id', async (req, res) => {
  await Media.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});  


//online banking iugfghdjhgcghsuhgcgdhsuhg
 
 
 const NEWJWT_SECRET = "ihfghjkdjhvhjdhvbnfkerufyhijihekjdfenechvbejy";
 const ADMIN_PASSWORD = "123456";
 
 // --- MODELS ---
 const UserSchema = new mongoose.Schema({
   email: String,
   password: String,
   referenceCode: String,
   ngnBalance: { type: Number, default: 0 },
   usdBalance: { type: Number, default: 0 },
 });
 const NewUser = mongoose.model('NewUser', UserSchema);
 
 const PendingSchema = new mongoose.Schema({
   referenceCode: String,
   email: String,
   amount: Number,
   type: String,
   status: { type: String, default: 'pending' },
   createdAt: { type: Date, default: Date.now }
 });
 const Pending = mongoose.model('Pending', PendingSchema);
 
 const WithdrawSchema = new mongoose.Schema({
   referenceCode: String,
   email: String,
   amount: Number,
   bankName: String,
   accountNumber: String,
   accountName: String,
   type: String,
   status: { type: String, default: 'pending' },
   createdAt: { type: Date, default: Date.now }
 });
 const Withdraw = mongoose.model('Withdraw', WithdrawSchema);
 
 // NEW: Transaction history
 const TransactionSchema = new mongoose.Schema({
   referenceCode: String,
   type: String,
   amount: Number,
   status: String,
   details: String,
   createdAt: { type: Date, default: Date.now }
 });
 const Transaction = mongoose.model('Transaction', TransactionSchema);
 
 // --- AUTH ---
 app.post('/api/signup', async (req,res)=>{
   const { email, password } = req.body;
   const exists = await NewUser.findOne({email});
   if(exists) return res.json({error: "Email exists"});
   
   const count = await NewUser.countDocuments();
   const ref = `USER${String(count + 1).padStart(4,'0')}`;
   
   const hashed = await bcrypt.hash(password, 10);
   const user = await NewUser.create({ email, password: hashed, referenceCode: ref });
   
   const token = jwt.sign({ id: user._id }, NEWJWT_SECRET);
   res.json({ token, referenceCode: ref, email });
 });
 
 app.post('/api/login', async (req,res)=>{
   const { email, password } = req.body;
   const user = await NewUser.findOne({email});
   if(!user) return res.json({error: "No user"});
   const ok = await bcrypt.compare(password, user.password);
   if(!ok) return res.json({error: "Wrong password"});
   const token = jwt.sign({ id: user._id }, NEWJWT_SECRET);
   res.json({ token, referenceCode: user.referenceCode, email });
 });
 
 function authMiddleware(req,res,next){
   const token = req.headers.authorization?.split(' ')[1];
   if(!token) return res.json({error: "No token"});
   try{
     const decoded = jwt.verify(token, NEWJWT_SECRET);
     req.userId = decoded.id;
     next();
   }catch{ 
     return res.json({error: "Invalid token"}) 
   }
 }
 
 app.get('/api/me', authMiddleware, async (req,res)=>{
   const user = await NewUser.findById(req.userId);
   if(!user) return res.json({error: "User not found"});
   res.json({ email: user.email, referenceCode: user.referenceCode, ngnBalance: user.ngnBalance, usdBalance: user.usdBalance });
 });
 
 // --- DEPOSITS ---
 app.post('/api/deposit/claim-ngn', authMiddleware, async (req,res)=>{
   const { amount } = req.body;
   const user = await NewUser.findById(req.userId);
   await Pending.create({ referenceCode: user.referenceCode, email: user.email, amount: Number(amount), type: 'ngn' });
   await Transaction.create({ referenceCode: user.referenceCode, type: 'deposit-ngn', amount: Number(amount), status: 'pending', details: 'PalmPay deposit' });
   res.json({ success: true });
 });
 
 app.post('/api/deposit/claim-usd', authMiddleware, async (req,res)=>{
   const { amount } = req.body;
   const user = await NewUser.findById(req.userId);
   await Pending.create({ referenceCode: user.referenceCode, email: user.email, amount: Number(amount), type: 'usd' });
   await Transaction.create({ referenceCode: user.referenceCode, type: 'deposit-usd', amount: Number(amount), status: 'pending', details: 'GeegPay deposit' });
   res.json({ success: true });
 });
 
 // --- WITHDRAWAL - FIXED ---
 app.post('/api/withdraw/request', authMiddleware, async (req,res)=>{
   try{
     const { amount, bankName, accountNumber, accountName, type } = req.body;
     const user = await NewUser.findById(req.userId);
     if(!user) return res.json({error: "User not found"});
     
     if(type==='ngn' && user.ngnBalance < Number(amount)) return res.json({error: `Insufficient NGN. You have ₦${user.ngnBalance}`});
     if(type==='usd' && user.usdBalance < Number(amount)) return res.json({error: `Insufficient USD. You have $${user.usdBalance}`});
 
     if(type==='ngn') user.ngnBalance -= Number(amount);
     if(type==='usd') user.usdBalance -= Number(amount);
     await user.save();
 
     const w = await Withdraw.create({ 
       referenceCode: user.referenceCode,
       email: user.email,
       amount: Number(amount), 
       bankName, accountNumber, accountName, type 
     });
     await Transaction.create({ 
       referenceCode: user.referenceCode, 
       type: `withdraw-${type}`, 
       amount: Number(amount), 
       status: 'pending', 
       details: `${bankName} ${accountNumber}` 
     });
     console.log(`NEW WITHDRAWAL: ${w.referenceCode} ${type} ${amount}`);
     res.json({success: true});
   }catch(e){ console.log(e); res.json({error: "Server error"}) }
 });
 
 app.get('/api/transactions', authMiddleware, async (req,res)=>{
   const user = await NewUser.findById(req.userId);
   const tx = await Transaction.find({ referenceCode: user.referenceCode }).sort({ createdAt: -1 }).limit(50);
   res.json(tx);
 });
 
 // --- ADMIN ---
 app.post('/api/admin/login', (req,res)=>{
   if(req.body.password === ADMIN_PASSWORD) res.json({ success: true });
   else res.json({ error: "Wrong admin password" });
 });
 
 app.get('/api/admin/pending-deposits', async (req,res)=>{
   const pendings = await Pending.find({ status: 'pending' }).sort({ createdAt: -1 });
   res.json(pendings);
 });
 
 app.post('/api/admin/credit-ngn', async (req,res)=>{
   const { referenceCode, amount } = req.body;
   await NewUser.findOneAndUpdate({ referenceCode }, { $inc: { ngnBalance: Number(amount) } });
   await Pending.findOneAndDelete({ referenceCode, amount: Number(amount), type: 'ngn' });
   await Transaction.findOneAndUpdate({ referenceCode, amount: Number(amount), type: 'deposit-ngn', status: 'pending' }, { status: 'approved' });
   res.json({ success: true });
 });
 
 app.post('/api/admin/credit-usd', async (req,res)=>{
   const { referenceCode, amount } = req.body;
   await NewUser.findOneAndUpdate({ referenceCode }, { $inc: { usdBalance: Number(amount) } });
   await Pending.findOneAndDelete({ referenceCode, amount: Number(amount), type: 'usd' });
   await Transaction.findOneAndUpdate({ referenceCode, amount: Number(amount), type: 'deposit-usd', status: 'pending' }, { status: 'approved' });
   res.json({ success: true });
 });
 
 app.get('/api/admin/withdrawals', async (req,res)=>{
   const list = await Withdraw.find({ status: 'pending' }).sort({ createdAt: -1 });
   res.json(list);
 });
 
 app.post('/api/admin/approve-withdraw', async (req,res)=>{
   const { id } = req.body;
   await Withdraw.findByIdAndUpdate(id, { status: 'approved' });
   const w = await Withdraw.findById(id);
   if(w) await Transaction.findOneAndUpdate({ referenceCode: w.referenceCode, amount: w.amount, type: `withdraw-${w.type}`, status: 'pending' }, { status: 'approved' });
   res.json({success: true});
 });
 
 app.post('/api/admin/reject-withdraw', async (req,res)=>{
   const { id } = req.body;
   const w = await Withdraw.findById(id);
   if(w){
     const user = await NewUser.findOne({ referenceCode: w.referenceCode });
     if(user){
       if(w.type==='ngn') user.ngnBalance += w.amount;
       else user.usdBalance += w.amount;
       await user.save();
     }
     await Withdraw.findByIdAndDelete(id);
     await Transaction.findOneAndDelete({ referenceCode: w.referenceCode, amount: w.amount, type: `withdraw-${w.type}`, status: 'pending' });
   }
   res.json({success: true});
 });
 
 // online banking end here tdsdtyuiuytrdfuiuyt


 app.listen(port, console.log('server is running on port 8000'))