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
const API_KEY = "1f6245b3640a4f8dbdcd4ef044526b30"; // Your football-data.org free key
const API_URL = "https://api.football-data.org/v4"; // Base URL

// ========== ANTI-BAN SYSTEM - MAIN PROTECTION FOR 1000 USERS ==========

// isSyncing = Lock. If vercel cron triggers twice or 2 people hit /api/sync same time, only 1 sync runs.
// Without this, 2 syncs = 4 API calls at once = risk of 429.
let isSyncing = false;

// liveCache = MOST IMPORTANT ANTI-BAN.
// Football-data free limit = 10 requests per minute. If 1000 users open /api/live at same time:
// WITHOUT cache: 1000 API calls in 1 minute = you get banned instantly (429 error).
// WITH this cache: First user triggers 1 real API call, we save result + time. For next 60 seconds,
// we serve the saved result from server RAM to the other 999 users. So 1000 users = 1 API call/min = SAFE.
let liveCache = { data: [], time: 0 };

// visitorCache = ANTI-SPAM for single IP.
// If 1 person refreshes page 20 times in 10 seconds (F5 spam), without this = 20 API calls = ban risk.
// With this: We store last request time per IP. If same IP asks within 10 seconds, we give cached data immediately, no API call.
let visitorCache = new Map();

// ========== DATABASE MODEL ==========
// We save matches in MongoDB so we NEVER call football-data for normal page loads.
// Upcoming/Finished tabs will read from this DB = 0 API calls = can handle unlimited users.
const Match = mongoose.models.Match || mongoose.model("Match", new mongoose.Schema({
  _id: String, // football-data match id
  date: Date, // match kickoff time
  status: String, // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED
  minute: Number, // current minute like 67
  minuteText: String, // display like "67'" or "HT" or "FT"
  league: String,
  home: {name:String, logo:String},
  away: {name:String, logo:String},
  homeScore: Number,
  awayScore: Number,
  updatedAt: Date
}));

// ========== HELPER: GET DATE STRING ==========
// Returns YYYY-MM-DD for today +/- n days. Used to ask football-data for range.
function getDate(n=0){
  let d=new Date();
  d.setDate(d.getDate()+n);
  return d.toISOString().split("T")[0];
}

// ========== HELPER: CALL FOOTBALL-DATA API ==========
async function api(endpoint, params={}){
  const url = new URL(API_URL+endpoint);
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  const r = await fetch(url,{ headers:{ "X-Auth-Token": API_KEY }});
  const data = await r.json();
  if(!r.ok) throw Error(data.message || "API Error");
  return data;
}

// ========== HELPER: FORMAT API DATA FOR OUR DB ==========
function format(m){
  return {
    _id: String(m.id),
    date: new Date(m.utcDate),
    status: m.status,
    minute: m.minute||null,
    minuteText: m.status==="IN_PLAY"? `${m.minute||0}'` : m.status==="PAUSED"? "HT" : m.status==="FINISHED"? "FT" : null,
    league: m.competition?.name,
    home: { name: m.homeTeam?.name, logo: `https://crests.football-data.org/${m.homeTeam.id}.png` },
    away: { name: m.awayTeam?.name, logo: `https://crests.football-data.org/${m.awayTeam.id}.png` },
    homeScore: m.score?.fullTime?.home?? m.score?.halfTime?.home?? 0,
    awayScore: m.score?.fullTime?.away?? m.score?.halfTime?.away?? 0,
    updatedAt: new Date()
  };
}

// ========== CORE: SYNC 7 DAYS BACK + 7 DAYS FRONT TO DB ==========
// This runs ONLY once per day at 2am WAT via vercel cron.
// ANTI-BAN LOGIC HERE:
// Free plan: 10 req/min max. If we sync every hour = 48 API calls/day but risk of hitting limit if many cron runs.
// We do 1 sync per day = 2 API calls only = super safe.
// We also wait 6.5 seconds between 2 calls because free plan needs gap.
async function fullSyncToDB(){
  if(isSyncing) return {synced:0,total:0}; // Prevent double sync
  isSyncing=true;
  try{
    if(mongoose.connection.readyState!==1) await mongoose.connect(process.env.MONGO_URI);

    // 1st API call: get matches from 7 days ago to today (past week + today)
    const past = await api("/matches", {dateFrom:getDate(-7), dateTo:getDate()});

    // WAIT 6.5 seconds - MANDATORY for free plan to avoid 429 Too Many Requests / ban
    await new Promise(r=>setTimeout(r,6500));

    // 2nd API call: get matches from today to next 7 days (future)
    const future = await api("/matches", {dateFrom:getDate(), dateTo:getDate(7)});

    // Merge past + future and remove duplicates by id
    const map=new Map();
    [...(past.matches||[]),...(future.matches||[])].forEach(m=>map.set(m.id,m));
    const formatted=[...map.values()].map(format);

    // Save to DB: upsert = update if exists, insert if new
    if(formatted.length){
      await Match.bulkWrite(formatted.map(m=>({
        updateOne:{filter:{_id:m._id}, update:{$set:m}, upsert:true}
      })),{ordered:false});
    }
    return {synced:formatted.length, total: await Match.countDocuments()};
  }finally{
    isSyncing=false; // Release lock
  }
}

// ========== CORE: GET MATCHES FROM DB (0 API COST) ==========
// ANTI-BAN: This function is WHY 1000 users don't ban you.
// All users reading upcoming/finished read from YOUR MongoDB, not from football-data.
// MongoDB can handle 1000 reads/sec easily, football-data free cannot.
// 1000 users = 0 API calls to football-data here.
async function getMatches(type){
  const now=new Date();
  let filter={};
  if(type==="upcoming"){
    const start=new Date(); start.setDate(start.getDate()-7); start.setHours(0,0,0,0); // 7 days back
    const end=new Date(); end.setDate(end.getDate()+7); end.setHours(23,59,59,999); // 7 days front
    filter={ date:{ $gte:start, $lte:end }, status:{ $in:["SCHEDULED","TIMED","IN_PLAY","LIVE","PAUSED"] } };
  } else if(type==="finished"){
    const start=new Date(); start.setDate(start.getDate()-7);
    filter={ date:{ $gte:start, $lte:now }, status:"FINISHED" };
  }
  const matches=await Match.find(filter).lean();
  return matches.sort((a,b)=>new Date(a.date)-new Date(b.date));
}

// ========== ROUTE 1: /api/matches - FROM DB ONLY (SAFE FOR 1000 USERS) ==========
app.get("/api/matches", async(req,res)=>{
  try{
    if(mongoose.connection.readyState!==1) await mongoose.connect(process.env.MONGO_URI);
    res.set('Cache-Control','no-store'); // Always fresh from DB, no browser cache
    // This reads from DB = 0 API calls = 1000 users safe
    const matches = await getMatches(req.query.tab||"upcoming");
    res.json({success:true, matches});
  }catch(e){ res.json({success:false, matches:[], error:e.message}); }
});

// ========== ROUTE 2: /api/live - DIRECT API BUT WITH 60s CACHE (ANTI-BAN) ==========
// This gives REAL minute like 67' and real score 2-1
// WITHOUT cache: 1000 users = 1000 API calls in 1 min = BAN (limit 10/min)
// WITH cache: 1000 users = 1 API call per minute = SAFE
app.get("/api/live", async(req,res)=>{
  res.set('Cache-Control','no-store');
  try{
    const now=Date.now();
    const ip = req.headers['x-forwarded-for'] || req.ip;

    // ANTI-BAN LAYER 1: IP DEDUPLICATION
    // If same IP asked <10s ago, serve cache immediately. No API call.
    // Prevents 1 user spamming F5 from banning whole site.
    if(visitorCache.has(ip) && now - visitorCache.get(ip) < 10000){
      return res.json({success:true, matches: liveCache.data, cached:true});
    }
    visitorCache.set(ip, now);

    // ANTI-BAN LAYER 2: GLOBAL 60s CACHE
    // If we fetched live within last 60 seconds, serve cache for ALL users (all IPs).
    // This is main protection: 1000 users in same minute = 1 API call, 999 from cache.
    if(now - liveCache.time < 60000 && liveCache.data){
      return res.json({success:true, matches: liveCache.data, cached:true});
    }

    // Only if cache expired (after 60s) we call real football-data API - 1 call per minute max
    const today = await api("/matches", {dateFrom:getDate(), dateTo:getDate()});
    const live = (today.matches||[]).filter(m=> ["IN_PLAY","PAUSED","LIVE"].includes(m.status));
    const formatted = live.map(format);

    // Save to cache for next 60 seconds
    liveCache = { data: formatted, time: now };
    res.json({success:true, matches: formatted, cached:false});

  }catch(e){
    // If API fails or we get 429 banned, still serve old cache so frontend doesn't break and doesn't retry API
    if(liveCache.data.length>0) return res.json({success:true, matches: liveCache.data, cached:true});
    res.json({success:false, matches:[], error:e.message});
  }
});

// ========== ROUTE 3: /api/sync - CRON AT 2AM WAT ==========
// Vercel calls this automatically at 0 1 * * * (1am UTC = 2am Lagos)
// You should also call it manually once after deploy to fill DB first time
// ANTI-BAN: Only 1 time per day = 2 API calls/day = you use <1% of limit

// ADD THIS AT TOP with other caches
let syncCache = { time: 0, data: null };

// ========== ROUTE 3: /api/sync - PROTECTED ==========

app.get("/api/sync", async(req,res)=>{
  const now = Date.now();

  // 1. If we synced within 1 hour, return cache INSTANTLY (0ms)
  if(now - syncCache.time < 3600000 && syncCache.data){
    return res.json({success:true,...syncCache.data, cached:true, message:"Sync cooldown 1hr - cached"});
  }

  // 2. If already syncing, return INSTANTLY
  if(isSyncing){
    return res.json({success:false, cached:true, message:"Sync already running in background, use /api/matches for now"});
  }

  // 3. INSTANT RESPONSE - Don't wait for football-data
  res.json({
    success:true, 
    message:"Sync started in background - will finish in 15s, use /api/matches now",
    cached:false, 
    timeWAT: new Date().toLocaleString("en-NG",{timeZone:"Africa/Lagos"})
  });

  // 4. Do heavy work AFTER response sent - user already got instant reply
  isSyncing = true;
  fullSyncToDB()
    .then(r => {
      syncCache = { time: Date.now(), data: r };
      isSyncing = false;
      console.log("✅ Background sync done:", r);
    })
    .catch(e => {
      console.log("❌ Background sync error:", e.message);
      isSyncing = false;
    });
});


// matach end here kjhgfdghjkjhgfcghjkjhgf


// country match ihgfchjjhgviiuyuiodiuuojihuuiub

 // old e11e83e05b19af09fbdd776affffc3a7
 
  const API=process.env.API_FOOTBALL_KEY||'e11e83e05b19af09fbdd776affffc3a7';
const BASE='https://v3.football.api-sports.io';

// DB Schema for country matches
const countrySchema=new mongoose.Schema({
 fixture_id:{type:Number,unique:true},home_team:String,away_team:String,
 home_logo:String,away_logo:String,league:String,league_logo:String,
 match_date:Date,status:String,elapsed:{type:Number,default:null},
 score_home:{type:Number,default:null},score_away:{type:Number,default:null},
 last_updated:{type:Date,default:Date.now}
});
const CountryMatch=mongoose.models.CountryMatch || mongoose.model('CountryMatch',countrySchema);

// Live and finished status
const LIVE=new Set(['1H','HT','2H','ET','BT','P','LIVE','INT']);
const DONE=new Set(['FT','AET','PEN']);

// Check if match is country vs country
function isCountry(m){
 if(m.teams?.home?.national===true&&m.teams?.away?.national===true)return true;
 const n=(m.league?.name||'').toLowerCase();
 return[
  'world cup','world cup qualification','world cup qualifiers','euro',
  'european championship','european championship qualification',
  'euro qualification','nations league','africa cup of nations','afcon',
  'africa cup','african nations','asian cup','afc asian cup','copa america',
  'concacaf','gold cup','concacaf nations league','oceania nations cup',
  'ofc nations cup','international friendly','international friendlies',
  'friendlies'
 ].some(x=>n.includes(x));
}

// Helper to get date string
const day=(d,n)=>{
 const x=new Date(d);
 x.setUTCDate(x.getUTCDate()+n);
 return x.toISOString().slice(0,10);
};

let fetching=false;

// Fetch one day from API - FIXED timeout 8s not 20s to avoid Vercel 30s timeout
async function getDay(date){
 try{
  const r=await axios.get(`${BASE}/fixtures`,{
   params:{date},
   headers:{'x-apisports-key':API},
   timeout:8000 // FIXED: was 20000 = cause timeout
  });
  if(r.data?.errors&&Object.keys(r.data.errors).length){
   console.log(`⚠️ ${date}`,r.data.errors);
   return[];
  }
  return r.data?.response||[];
 }catch(e){
  console.log(`❌ ${date}`,e.response?.data||e.message);
  return[];
 }
}

// Old single save (kept for backup)
async function save(m){
 if(!m.fixture?.id||!m.teams?.home||!m.teams?.away)return;
 await CountryMatch.updateOne(
  {fixture_id:m.fixture.id},
  {$set:{
   fixture_id:m.fixture.id,
   home_team:m.teams.home.name,away_team:m.teams.away.name,
   home_logo:m.teams.home.logo||'',away_logo:m.teams.away.logo||'',
   league:m.league?.name||'International',
   league_logo:m.league?.logo||'',
   match_date:new Date(m.fixture.date),
   status:m.fixture.status?.short||'NS',
   elapsed:m.fixture.status?.elapsed??null,
   score_home:m.goals?.home??null,
   score_away:m.goals?.away??null,
   last_updated:new Date()
  }},
  {upsert:true}
 );
}

// Main fetch - FIXED FAST MODE to avoid Vercel 30s timeout + 3 DAYS BACK/FRONT LOGIC
async function fetchCountryMatches(){
 if(fetching){
   console.log('⏳ Fetch already running');
   return {total:0, saved:0, deleted:0};
 }
 if(!API){
   console.log('❌ API key missing');
   return {total:0, saved:0, deleted:0};
 }
 fetching=true;

 try{
  if(mongoose.connection.readyState!==1){
    await mongoose.connect(process.env.MONGO_URI);
  }

  const now=new Date();
  now.setUTCHours(0,0,0,0);

  // FIXED: 3 DAYS BACK AND FRONT LOGIC (-3 to +3) = 7 days
  // k-3 gives: -3,-2,-1,0,1,2,3
  const dates=Array.from({length:7},(_,k)=>day(now,k-3));
  
  // FIXED: allSettled not all (if 1 fails, others still save) + avoids 30s hang
  const allResultsSettled=await Promise.allSettled(dates.map(d=>getDay(d)));

  let total=0;
  const countryMatches=[];

  allResultsSettled.forEach((result,idx)=>{
    if(result.status==='fulfilled'){
      const list=result.value;
      total+=list.length;
      const filtered=list.filter(isCountry);
      countryMatches.push(...filtered);
      console.log(`📅 ${dates[idx]}: ${list.length} -> ${filtered.length} country`);
    }else{
      console.log(`❌ ${dates[idx]} failed:`, result.reason?.message);
    }
  });

  // FIXED: Bulk write once (was save() one by one = timeout)
  if(countryMatches.length){
    await CountryMatch.bulkWrite(countryMatches.map(m=>({
      updateOne:{
        filter:{fixture_id:m.fixture.id},
        update:{$set:{
          fixture_id:m.fixture.id,
          home_team:m.teams.home.name,away_team:m.teams.away.name,
          home_logo:m.teams.home.logo||'',away_logo:m.teams.away.logo||'',
          league:m.league?.name||'International',
          league_logo:m.league?.logo||'',
          match_date:new Date(m.fixture.date),
          status:m.fixture.status?.short||'NS',
          elapsed:m.fixture.status?.elapsed??null,
          score_home:m.goals?.home??null,
          score_away:m.goals?.away??null,
          last_updated:new Date()
        }},
        upsert:true
      }
    })),{ordered:false});
  }

  // Delete old matches outside -3 to +3 range
  const start=new Date(now);
  start.setUTCDate(start.getUTCDate()-3);
  const end=new Date(now);
  end.setUTCDate(end.getUTCDate()+3);
  end.setUTCHours(23,59,59,999);

  const d=await CountryMatch.deleteMany({
   $or:[{match_date:{$lt:start}},{match_date:{$gt:end}}]
  });

  console.log(`✅ API:${total} Saved:${countryMatches.length} Deleted:${d.deletedCount}`);
  return {total, saved:countryMatches.length, deleted:d.deletedCount};
 }catch(e){
  console.log('❌ FETCH:',e.message);
  return {total:0, saved:0, deleted:0, error:e.message};
 }finally{fetching=false;}
}

// FOR RENDER ONLY - Vercel uses cron-job.org

if(mongoose.connection.readyState===1)fetchCountryMatches();
else mongoose.connection.once('connected',fetchCountryMatches);


/* MATCHES - Returns filtered by tab */
app.get('/api/matches-country',async(req,res)=>{
 try{
  const tab=(req.query.tab||'upcoming').toLowerCase();
  const now=new Date();
  now.setUTCHours(0,0,0,0);

  const start=new Date(now);
  start.setUTCDate(start.getUTCDate()-3);

  const end=new Date(now);
  end.setUTCDate(end.getUTCDate()+3);
  end.setUTCHours(23,59,59,999);

  let db=await CountryMatch.find({
   match_date:{$gte:start,$lte:end}
  }).lean();

  if(tab==='live')
   db=db.filter(m=>LIVE.has(m.status));
  else if(['finished','recent','past'].includes(tab))
   db=db.filter(m=>DONE.has(m.status))
     .sort((a,b)=>new Date(b.match_date)-new Date(a.match_date));
  else if(tab==='today'){
   const tomorrow=new Date(now);
   tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
   db=db.filter(m=>{
    const d=new Date(m.match_date);
    return d>=now&&d<tomorrow;
   }).sort((a,b)=>new Date(a.match_date)-new Date(b.match_date));
  }else
   db=db.filter(m=>!DONE.has(m.status)&&!LIVE.has(m.status))
     .sort((a,b)=>new Date(a.match_date)-new Date(b.match_date));

  res.json({
   success:true,count:db.length,
   matches:db.map(m=>({
    id:m.fixture_id,league:m.league,leagueLogo:m.league_logo,
    date:m.match_date,
    status:DONE.has(m.status)?'FINISHED':LIVE.has(m.status)?'IN_PLAY':'SCHEDULED',
    home:{name:m.home_team,logo:m.home_logo},
    away:{name:m.away_team,logo:m.away_logo},
    homeScore:m.score_home,awayScore:m.score_away,
    elapsed:m.elapsed,rawStatus:m.status
   }))
  });
 }catch(e){
  console.log('❌ MATCH API:',e.message);
  res.status(500).json({success:false,matches:[],error:e.message});
 }
});

/* ALL - Returns all raw from DB */
app.get('/api/country-matches',async(req,res)=>{
 try{
  const now=new Date();
  now.setUTCHours(0,0,0,0);
  const start=new Date(now);
  start.setUTCDate(start.getUTCDate()-3);
  const end=new Date(now);
  end.setUTCDate(end.getUTCDate()+3);
  end.setUTCHours(23,59,59,999);

  res.json(await CountryMatch.find({
   match_date:{$gte:start,$lte:end}
  }).sort({match_date:1}).lean());
 }catch(e){
  console.log('❌ COUNTRY API:',e.message);
  res.status(500).json([]);
 }
});

/* MANUAL FOR CRON-JOB.ORG - 2 HOURS ROUTE */
app.get('/api/fetch-now',async(req,res)=>{
 if(fetching)return res.json({success:false,message:'Fetch already running'});
 
 if(mongoose.connection.readyState!==1){
   await mongoose.connect(process.env.MONGO_URI);
 }

 const result = await fetchCountryMatches();
 res.json({
  success:true,
  message:'Fetch complete - saved to DB',
  synced: result.saved,
  apiTotal: result.total,
  deleted: result.deleted,
  totalInDB:await CountryMatch.countDocuments(),
  time: new Date().toISOString()
 });
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