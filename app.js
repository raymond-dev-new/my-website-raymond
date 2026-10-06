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


 //start her sdfyuiopiuytrewrtyuiopoiuytretkjhgf

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
const API_KEY=process.env.FOOTBALL_DATA_KEY||"1f6245b3640a4f8dbdcd4ef044526b30";
const API_URL="https://api.football-data.org/v4";

// ========== ANTI-BAN SYSTEM - MAIN PROTECTION FOR 1000 USERS ==========
let isSyncing=false;

// Live API is called ONLY every 2 minutes.
// All users share the same result.
let liveCache={data:[],time:0};

// Same IP gets cached result for 10 seconds.
let visitorCache=new Map();

// Sync cooldown.
let syncCache={time:0,data:null};


// ========== DATABASE MODEL ==========
const Match=mongoose.models.Match||mongoose.model("Match",new mongoose.Schema({
  _id:String,date:Date,status:String,minute:Number,minuteText:String,
  league:String,home:{name:String,logo:String},away:{name:String,logo:String},
  homeScore:Number,awayScore:Number,updatedAt:Date
}));


// ========== HELPER: GET DATE STRING ==========
function getDate(n=0){
  const d=new Date();
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
function format(m){
  const live=["IN_PLAY","LIVE","PAUSED"].includes(m.status);
  const home=m.score?.fullTime?.home??m.score?.halfTime?.home??0;
  const away=m.score?.fullTime?.away??m.score?.halfTime?.away??0;

  return{
    _id:String(m.id),
    date:new Date(m.utcDate),
    status:m.status,
    minute:typeof m.minute==="number"?m.minute:null,
    minuteText:
      m.status==="IN_PLAY"||m.status==="LIVE"?`${m.minute||0}'`:
      m.status==="PAUSED"?"HT":
      m.status==="FINISHED"?"FT":null,
    league:m.competition?.name,
    home:{
      name:m.homeTeam?.name,
      logo:m.homeTeam?.crest||`https://crests.football-data.org/${m.homeTeam?.id}.png`
    },
    away:{
      name:m.awayTeam?.name,
      logo:m.awayTeam?.crest||`https://crests.football-data.org/${m.awayTeam?.id}.png`
    },
    homeScore:home,awayScore:away,updatedAt:new Date()
  };
}


// ========== CORE: SYNC 9 DAYS BACK + 9 DAYS FRONT TO DB ==========
async function fullSyncToDB(){
  if(isSyncing)return{synced:0,total:0};
  isSyncing=true;

  try{
    if(!process.env.MONGO_URL)throw Error("MONGO_URL missing in env vars");
    if(mongoose.connection.readyState!==1)await mongoose.connect(process.env.MONGO_URL);

    // 1st API call: 9 days ago through today
    const past=await api("/matches",{dateFrom:getDate(-9),dateTo:getDate()});

    // WAIT 6.5 seconds - MANDATORY for free plan
    await new Promise(r=>setTimeout(r,6500));

    // 2nd API call: tomorrow through 9 days forward
    const future=await api("/matches",{dateFrom:getDate(1),dateTo:getDate(9)});

    const map=new Map();
    [...(past.matches||[]),...(future.matches||[])].forEach(m=>map.set(m.id,m));
    const formatted=[...map.values()].map(format);

    if(formatted.length)await Match.bulkWrite(
      formatted.map(m=>({
        updateOne:{filter:{_id:m._id},update:{$set:m},upsert:true}
      })),
      {ordered:false}
    );

    return{synced:formatted.length,total:await Match.countDocuments()};
  }finally{isSyncing=false;}
}


// ========== CORE: GET MATCHES FROM DB (0 API COST) ==========
async function getMatches(type){
  const now=new Date(),start=new Date();
  start.setDate(start.getDate()-7);

  let filter=type==="finished"
    ?{date:{$gte:start,$lte:now},status:"FINISHED"}
    :{
      date:{$gte:(()=>{const d=new Date();d.setDate(d.getDate()-7);return d;})(),
            $lte:(()=>{const d=new Date();d.setDate(d.getDate()+7);return d;})()},
      status:{$in:["SCHEDULED","TIMED","IN_PLAY","LIVE","PAUSED"]}
    };

  const matches=await Match.find(filter).lean();
  return matches.sort((a,b)=>new Date(a.date)-new Date(b.date));
}


// ========== ROUTE 1: /api/matches - FROM DB ONLY ==========
app.get("/api/matches",async(req,res)=>{
  try{
    if(mongoose.connection.readyState!==1)
      await mongoose.connect(process.env.MONGO_URL);

    res.set("Cache-Control","no-store");
    res.json({success:true,matches:await getMatches(req.query.tab||"upcoming")});
  }catch(e){
    res.json({success:false,matches:[],error:e.message});
  }
});


// ========== ROUTE 2: /api/live - REAL LIVE API ==========
// LIVE API CALL = ONLY ONCE EVERY 2 MINUTES.
// All users receive the same cached live scores/minutes.
app.get("/api/live",async(req,res)=>{
  res.set("Cache-Control","no-store");

  try{
    const now=Date.now();
    const ip=String(req.headers["x-forwarded-for"]||req.ip||"unknown").split(",")[0];

    // ANTI-BAN: same IP gets cached result.
    if(visitorCache.has(ip)&&now-visitorCache.get(ip)<10000){
      return res.json({success:true,matches:liveCache.data,cached:true});
    }
    visitorCache.set(ip,now);

    // ========== 2 MINUTE LIVE CACHE ==========
    // API is NOT called again until 120 seconds have passed.
    if(now-liveCache.time<120000){
      return res.json({
        success:true,
        matches:liveCache.data,
        cached:true,
        lastUpdated:liveCache.time
      });
    }

    // ========== GET REAL LIVE MATCHES ==========
    const today=await api("/matches",{
      dateFrom:getDate(),
      dateTo:getDate()
    });

    const live=(today.matches||[])
      .filter(m=>["IN_PLAY","LIVE","PAUSED"].includes(m.status))
      .map(format);

    liveCache={data:live,time:now};

    res.json({
      success:true,
      matches:live,
      cached:false,
      lastUpdated:now
    });

  }catch(e){
    // If API fails, keep old live data.
    if(liveCache.data.length){
      return res.json({
        success:true,
        matches:liveCache.data,
        cached:true,
        stale:true,
        lastUpdated:liveCache.time
      });
    }

    res.json({success:false,matches:[],error:e.message});
  }
});


// ========== ROUTE 3: /api/sync - MANUAL SYNC / CRON ==========
app.get("/api/sync",async(req,res)=>{
  const now=Date.now(),COOLDOWN=30*60*1000;

  try{
    if(mongoose.connection.readyState!==1)
      await mongoose.connect(process.env.MONGO_URL);

    // RAM cache 30min
    if(now-syncCache.time<COOLDOWN&&syncCache.data)
      return res.json({
        success:true,...syncCache.data,cached:true,
        message:"Sync cooldown 30min - RAM cached"
      });

    // MongoDB cache 30min
    const last=await Match.findOne().sort({updatedAt:-1});

    if(last&&now-new Date(last.updatedAt).getTime()<COOLDOWN)
      return res.json({
        success:true,cached:true,
        total:await Match.countDocuments(),
        message:"Sync cooldown 30min - DB cached"
      });

    // Prevent double sync
    if(isSyncing)
      return res.json({success:false,cached:true,message:"Sync already running"});

    const r=await fullSyncToDB();

    syncCache={time:Date.now(),data:r};

    res.json({
      success:true,...r,cached:false,
      timeWAT:new Date().toLocaleString("en-NG",{timeZone:"Africa/Lagos"}),
      message:`Synced ${r.synced} matches to DB`
    });

  }catch(e){
    res.json({success:false,error:e.message});
  }
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


 app.listen(port, console.log('server is running on port 8000'))