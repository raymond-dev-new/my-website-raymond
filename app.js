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
const API_KEY="1f6245b3640a4f8dbdcd4ef044526b30"; // Your football-data.org free key
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
let liveCache={data:[],time:0};

// visitorCache = ANTI-SPAM for single IP.
// If 1 person refreshes page 20 times in 10 seconds, without this = 20 API calls.
// With this: same IP within 10 seconds gets cached data immediately.
let visitorCache=new Map();

// syncCache = PROTECTION FOR /api/sync - 1hr cooldown so users can't spam sync and ban you.
// FIXED: Defined only once at top - duplicate at bottom crashed app.
let syncCache={time:0,data:null};


// ========== DATABASE MODEL ==========
// We save matches in MongoDB so we NEVER call football-data for normal page loads.
// Upcoming/Finished tabs read from this DB = 0 API calls = can handle unlimited users.
const Match=mongoose.models.Match||mongoose.model("Match",new mongoose.Schema({
  _id:String,
  date:Date,
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
function format(m){
  return{
    _id:String(m.id),
    date:new Date(m.utcDate),
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
    homeScore:m.score?.fullTime?.home??m.score?.halfTime?.home??0,
    awayScore:m.score?.fullTime?.away??m.score?.halfTime?.away??0,
    updatedAt:new Date()
  };
}


// ========== CORE: SYNC 9 DAYS BACK + 9 DAYS FRONT TO DB ==========
// This runs when /api/sync is opened manually or by cron.
// ANTI-BAN LOGIC HERE:
// Free plan: 10 req/min max. We make only 2 API calls per sync.
// We wait 6.5 seconds between the 2 calls to avoid 429 errors.
async function fullSyncToDB(){

  if(isSyncing)return{synced:0,total:0};

  isSyncing=true;

  try{
    // FIXED: Using ONLY MONGO_URL as per your env file
    if(!process.env.MONGO_URL)throw Error("MONGO_URL missing in env vars");
    if(mongoose.connection.readyState!==1)
      await mongoose.connect(process.env.MONGO_URL);

    // 1st API call: 9 days ago through today
    // This gets past matches + today's matches.
    const past=await api("/matches",{
      dateFrom:getDate(-9),
      dateTo:getDate()
    });

    // WAIT 6.5 seconds - MANDATORY for free plan to avoid 429
    await new Promise(r=>setTimeout(r,6500));

    // 2nd API call: tomorrow through 9 days forward
    // This completes the full 9-days-back + 9-days-front window.
    const future=await api("/matches",{
      dateFrom:getDate(1),
      dateTo:getDate(9)
    });

    // Merge both API results and remove duplicate match IDs.
    const map=new Map();

    [...(past.matches||[]),...(future.matches||[])]
      .forEach(m=>map.set(m.id,m));

    const formatted=[...map.values()].map(format);

    // Save to DB: update existing matches or insert new matches.
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

    return{
      synced:formatted.length,
      total:await Match.countDocuments()
    };

  }finally{
    isSyncing=false; // Release lock
  }
}


// ========== CORE: GET MATCHES FROM DB (0 API COST) ==========
// ANTI-BAN: This function is WHY 1000 users don't ban you.
// All users reading upcoming/finished read from YOUR MongoDB, not football-data.
// 1000 users = 0 API calls to football-data here.
async function getMatches(type){

  const now=new Date();
  let filter={};

  if(type==="upcoming"){
    const start=new Date();
    start.setDate(start.getDate()-7);
    start.setHours(0,0,0,0);

    const end=new Date();
    end.setDate(end.getDate()+7);
    end.setHours(23,59,59,999);

    filter={
      date:{$gte:start,$lte:end},
      status:{$in:["SCHEDULED","TIMED","IN_PLAY","LIVE","PAUSED"]}
    };

  }else if(type==="finished"){

    const start=new Date();
    start.setDate(start.getDate()-7);

    filter={
      date:{$gte:start,$lte:now},
      status:"FINISHED"
    };
  }

  const matches=await Match.find(filter).lean();
  return matches.sort((a,b)=>new Date(a.date)-new Date(b.date));
}


// ========== ROUTE 1: /api/matches - FROM DB ONLY (SAFE FOR 1000 USERS) ==========
app.get("/api/matches",async(req,res)=>{
  try{

    // FIXED: Using ONLY MONGO_URL
    if(mongoose.connection.readyState!==1)
      await mongoose.connect(process.env.MONGO_URL);

    res.set("Cache-Control","no-store");

    // This reads from DB = 0 API calls = 1000 users safe.
    const matches=await getMatches(req.query.tab||"upcoming");

    res.json({success:true,matches});

  }catch(e){
    res.json({
      success:false,
      matches:[],
      error:e.message
    });
  }
});


// ========== ROUTE 2: /api/live - DIRECT API BUT WITH 60s CACHE (ANTI-BAN) ==========
// This gives REAL minute like 67' and real score 2-1.
// WITHOUT cache: 1000 users = 1000 API calls in 1 min = BAN.
// WITH cache: 1000 users = 1 API call per minute = SAFE.
app.get("/api/live",async(req,res)=>{

  res.set("Cache-Control","no-store");

  try{
    const now=Date.now();
    const ip=req.headers["x-forwarded-for"]||req.ip;

    // ANTI-BAN LAYER 1: IP DEDUPLICATION
    // Same IP within 10s gets cached data immediately.
    if(visitorCache.has(ip)&&now-visitorCache.get(ip)<10000){
      return res.json({
        success:true,
        matches:liveCache.data,
        cached:true
      });
    }

    visitorCache.set(ip,now);

    // ANTI-BAN LAYER 2: GLOBAL 60s CACHE
    // All users share this cache. Only 1 API request per 60 seconds.
    if(now-liveCache.time<60000&&liveCache.data){
      return res.json({
        success:true,
        matches:liveCache.data,
        cached:true
      });
    }

    // Only after cache expires do we call football-data API.
    const today=await api("/matches",{
      dateFrom:getDate(),
      dateTo:getDate()
    });

    const live=(today.matches||[])
      .filter(m=>["IN_PLAY","PAUSED","LIVE"].includes(m.status));

    const formatted=live.map(format);

    liveCache={
      data:formatted,
      time:now
    };

    res.json({
      success:true,
      matches:formatted,
      cached:false
    });

  }catch(e){

    // If API fails or gives 429, serve old cache so frontend doesn't break.
    if(liveCache.data.length>0){
      return res.json({
        success:true,
        matches:liveCache.data,
        cached:true
      });
    }

    res.json({
      success:false,
      matches:[],
      error:e.message
    });
  }
});


 // ========== ROUTE 3: /api/sync - MANUAL SYNC / CRON ==========
// Open https://raymonddomain.dev/api/sync manually after deploy.
// It fetches 9 days back + 9 days front and saves matches into MongoDB.
// ANTI-BAN FOR 5000 TRAFFIC:
// - RAM cache 30min: fastest, no DB call
// - MongoDB cache 30min: survives Vercel cold start & multi-instance (100% bulletproof)
// - isSyncing lock: prevents double sync in same instance
app.get("/api/sync",async(req,res)=>{

  const now=Date.now();
  const COOLDOWN = 30*60*1000; // 30 minutes in ms

  try{
    // FIXED: Using ONLY MONGO_URL
    if(mongoose.connection.readyState!==1)
      await mongoose.connect(process.env.MONGO_URL);

    // 1. RAM cache check (0 DB calls, fastest for 5000 users)
    // If we synced within 30 min in THIS instance, return cached
    if(now-syncCache.time<COOLDOWN && syncCache.data){
      return res.json({
        success:true,
        ...syncCache.data,
        cached:true,
        message:"Sync cooldown 30min - RAM cached"
      });
    }

    // 2. MongoDB check (survives Vercel redeploy & multi-instance)
    // Even if Vercel creates 10 instances for 5000 users, all instances check same DB
    // So only 1 instance will do real API calls, other 9 get DB cached
    const last = await Match.findOne().sort({updatedAt:-1});
    if(last && now - new Date(last.updatedAt).getTime() < COOLDOWN){
      return res.json({
        success:true,
        cached:true,
        total: await Match.countDocuments(),
        message:"Sync cooldown 30min - DB cached"
      });
    }

    // 3. If another sync is already running in THIS instance
    if(isSyncing){
      return res.json({
        success:false,
        cached:true,
        message:"Sync already running"
      });
    }

    // 4. WAIT for sync to finish before sending response
    // Vercel can kill unfinished background work after response
    const r=await fullSyncToDB();

    syncCache={
      time:Date.now(),
      data:r
    };

    return res.json({
      success:true,
      ...r,
      cached:false,
      timeWAT:new Date().toLocaleString("en-NG",{
        timeZone:"Africa/Lagos"
      }),
      message:`Synced ${r.synced} matches to DB`
    });

  }catch(e){
    return res.json({
      success:false,
      error:e.message
    });
  }
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
    await mongoose.connect(process.env.MONGO_URL);
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
app.get('/api/fetch-now', async(req, res) => {
  // Prevent Chrome infinite loading - force timeout after 25s
  req.setTimeout(25000);
  res.setHeader('Content-Type', 'application/json');

  if (fetching) {
    return res.json({ success: false, message: 'Fetch already running' });
  }

  try {
    // Fix: use same env name
    const MONGO = process.env.MONGO_URI || process.env.MONGO_URL;
    
    if (mongoose.connection.readyState !== 1) {
      console.log('Connecting to Mongo...');
      await mongoose.connect(MONGO, { serverSelectionTimeoutMS: 5000 });
    }

    console.log('Starting fetch...');
    
    // Race against 20s timeout so Chrome never hangs
    const fetchPromise = fetchCountryMatches();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Fetch timed out after 20s')), 20000)
    );

    const result = await Promise.race([fetchPromise, timeoutPromise]);

    const count = await CountryMatch.countDocuments();

    return res.json({
      success: true,
      message: 'Fetch complete - saved to DB',
      synced: result.saved,
      apiTotal: result.total,
      deleted: result.deleted,
      totalInDB: count,
      time: new Date().toISOString()
    });

  } catch (e) {
    console.log('❌ fetch-now error:', e.message);
    fetching = false; // IMPORTANT: unlock if crashed
    return res.status(500).json({
      success: false,
      message: 'Fetch failed',
      error: e.message,
      totalInDB: await CountryMatch.countDocuments().catch(() => 0)
    });
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