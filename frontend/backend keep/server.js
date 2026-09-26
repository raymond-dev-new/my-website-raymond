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

 
//app.use(cors())
/*app.use(cors({ origin: "*",
  methods: ["GET", "POST" , "DELETE"]
 })); */

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


// ================= 2. CONFIG =================
const API_KEY = "1f6245b3640a4f8dbdcd4ef044526b30";
const API_URL="https://api.football-data.org/v4";
let isSyncing=false;

const Match=mongoose.model("Match",new mongoose.Schema({
  _id:String,date:Date,status:String,minute:Number,minuteText:String,league:String,
  home:{name:String,logo:String},away:{name:String,logo:String},
  homeScore:Number,awayScore:Number
}));

function getDate(n=0){let d=new Date();d.setDate(d.getDate()+n);return d.toISOString().split("T")[0]}

async function api(endpoint,params={}){
  const url=new URL(API_URL+endpoint);
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  const r=await fetch(url,{headers:{"X-Auth-Token":API_KEY}});
  const data=await r.json();
  if(!r.ok)throw Error(data.message||`Football API error: ${r.status}`);
  return data;
}

function calculateMinute(date,status,apiMinute){
  if(status==="PAUSED")return{minute:45,minuteText:"HT"};
  if(status!=="IN_PLAY")return{minute:null,minuteText:null};
  if(typeof apiMinute==="number"&&apiMinute>0)return{minute:apiMinute,minuteText:`${apiMinute}'`};

  let elapsed=Math.floor((Date.now()-new Date(date))/60000);
  if(elapsed<1)elapsed=1;
  if(elapsed<=45)return{minute:elapsed,minuteText:`${elapsed}'`};

  let second=elapsed-15;
  if(second>45&&second<=90)return{minute:second,minuteText:`${second}'`};
  if(elapsed>105)return{minute:90,minuteText:"FINISH"};
  return{minute:90,minuteText:"90+'"};
}

function format(m){
  const live=calculateMinute(m.utcDate,m.status,m.minute);
  return{
    _id:String(m.id),date:m.utcDate,status:m.status,
    minute:live.minute,minuteText:live.minuteText,
    league:m.competition?.name||"Football",
    home:{
      name:m.homeTeam?.name||"Home",
      logo:m.homeTeam?.id?`https://crests.football-data.org/${m.homeTeam.id}.png`:"https://via.placeholder.com/40"
    },
    away:{
      name:m.awayTeam?.name||"Away",
      logo:m.awayTeam?.id?`https://crests.football-data.org/${m.awayTeam.id}.png`:"https://via.placeholder.com/40"
    },
    homeScore:m.score?.fullTime?.home??m.score?.halfTime?.home??0,
    awayScore:m.score?.fullTime?.away??m.score?.halfTime?.away??0
  };
}

async function fullSyncToDB(){
  if(isSyncing)return console.log("[SKIP] Already syncing");
  isSyncing=true;
  console.log(`[SYNC] ${new Date().toLocaleString("en-NG",{timeZone:"Africa/Lagos"})} WAT`);

  try{
    const finished=await api("/matches",{dateFrom:getDate(-7),dateTo:getDate()});
    await new Promise(r=>setTimeout(r,7000));
    const upcoming=await api("/matches",{dateFrom:getDate(),dateTo:getDate(7)});

    const map=new Map();
    [...(finished.matches||[]),...(upcoming.matches||[])].forEach(m=>map.set(m.id,m));
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
      console.log(`[SYNCED] ${formatted.length} matches`);
    }
  }catch(e){
    console.log("[SYNC ERROR]",e.message);
  }finally{
    isSyncing=false;
  }
}

async function getMatches(type){
  try{
    let filter={};

    if(type==="today"){
      const s=new Date();s.setHours(0,0,0,0);
      const e=new Date();e.setHours(23,59,59,999);
      filter={date:{$gte:s,$lte:e}};
    }

    if(type==="upcoming")
      filter={date:{$gte:new Date(getDate()),$lte:new Date(getDate(7))},
        status:{$in:["SCHEDULED","TIMED","IN_PLAY","PAUSED"]}};

    if(type==="finished")
      filter={date:{$gte:new Date(getDate(-7)),$lte:new Date()},status:"FINISHED"};

    const matches=await Match.find(filter).lean();

    return matches.sort((a,b)=>{
      const la=["IN_PLAY","PAUSED"].includes(a.status);
      const lb=["IN_PLAY","PAUSED"].includes(b.status);
      if(la&&!lb)return-1;if(!la&&lb)return 1;
      return new Date(a.date)-new Date(b.date);
    });
  }catch(e){
    console.log("getMatches error:",e.message);
    return[];
  }
}

app.get("/api/matches",async(req,res)=>{
  try{
    res.json({success:true,matches:await getMatches(req.query.tab||"today")});
  }catch(e){
    res.json({success:true,matches:[]});
  }
});

// EVERY 2 MINUTES
cron.schedule("*/2 * * * *",()=>fullSyncToDB(),{timezone:"UTC"});

// INITIAL SYNC
setTimeout(fullSyncToDB,5000);

// matach end here kjhgfdghjkjhgfcghjkjhgf


// country match ihgfchjjhgviiuyuiodiuuojihuuiub

// ===== YOUR API KEY =====
const API = process.env.API_FOOTBALL_KEY || 'e11e83e05b19af09fbdd776affffc3a7';


// ===============================
// SCHEMA
// ===============================
const countrySchema = new mongoose.Schema({
  fixture_id: { type: Number, unique: true },
  home_team: String,
  away_team: String,
  home_logo: String,
  away_logo: String,
  league: String,
  league_logo: String,
  match_date: Date,
  status: String,
  elapsed: { type: Number, default: null },
  score_home: { type: Number, default: null },
  score_away: { type: Number, default: null },
  last_updated: { type: Date, default: Date.now }
});
const CountryMatch = mongoose.model('CountryMatch', countrySchema);

// ===============================
// COUNTRY CHECK
// ===============================
function isCountryMatch(m) {
  const league = (m.league?.name || '').toLowerCase();
  const countryCompetitions = [
    'world cup', 'world cup qualification', 'world cup qualifiers',
    'euro', 'european championship', 'european championship qualification', 'euro qualification', 'nations league',
    'africa cup of nations', 'afcon', 'africa cup', 'african nations',
    'asian cup', 'afc asian cup',
    'copa america',
    'concacaf', 'gold cup', 'concacaf nations league',
    'oceania nations cup', 'ofc nations cup',
    'friendlies', 'international friendly', 'international friendlies'
  ];
  return countryCompetitions.some(name => league.includes(name));
}

// ===============================
// FETCH
// ===============================
async function fetchCountryMatches() {
  try {
    console.log(`[FETCH START] ${new Date().toLocaleString()} - COUNTRY ONLY 3 DAYS`);
    let allCountryMatches = [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (let i = -3; i <= 3; i++) {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      try {
        const response = await axios.get(
          `https://v3.football.api-sports.io/fixtures?date=${dateStr}`,
          { headers: { 'x-apisports-key': API } }
        );
        const fixtures = response.data.response || [];
        const countryMatches = fixtures.filter(isCountryMatch);
        console.log(`[FETCH] ${dateStr} -> Total: ${fixtures.length} | Country: ${countryMatches.length}`);
        allCountryMatches.push(...countryMatches);
        await new Promise(r => setTimeout(r, 1100));
      } catch (dayErr) {
        console.log(`Error ${dateStr}:`, dayErr.response?.data?.errors || dayErr.message);
      }
    }

    for (const m of allCountryMatches) {
      const data = {
        fixture_id: m.fixture.id,
        home_team: m.teams.home.name,
        away_team: m.teams.away.name,
        home_logo: m.teams.home.logo,
        away_logo: m.teams.away.logo,
        league: m.league.name,
        league_logo: m.league.logo,
        match_date: new Date(m.fixture.date),
        status: m.fixture.status.short,
        elapsed: m.fixture.status.elapsed,
        score_home: m.goals.home,
        score_away: m.goals.away,
        last_updated: new Date()
      };
      await CountryMatch.findOneAndUpdate({ fixture_id: data.fixture_id }, data, { upsert: true, new: true });
    }

    const start = new Date(today); start.setUTCDate(start.getUTCDate() - 3);
    const end = new Date(today); end.setUTCDate(end.getUTCDate() + 3); end.setUTCHours(23,59,59,999);
    const deleted = await CountryMatch.deleteMany({ $or: [{ match_date: { $lt: start } }, { match_date: { $gt: end } }] });
    console.log(`[DB CLEANUP] Deleted ${deleted.deletedCount}`);
    console.log(`[TOTAL] Found ${allCountryMatches.length} COUNTRY matches`);
  } catch (err) {
    console.log('[API ERROR]:', err.message);
  }
}

// CRON 12 TIMES/DAY
cron.schedule('0 0 * * *', async () => { await fetchCountryMatches(); });
cron.schedule('0 2 * * *', async () => { await fetchCountryMatches(); });
cron.schedule('0 4 * * *', async () => { await fetchCountryMatches(); });
cron.schedule('0 6 * * *', async () => { await fetchCountryMatches(); });
cron.schedule('0 8 * * *', async () => { await fetchCountryMatches(); });
cron.schedule('0 10 * * *', async () => { await fetchCountryMatches(); });
cron.schedule('0 12 * * *', async () => { await fetchCountryMatches(); });
cron.schedule('0 14 * * *', async () => { await fetchCountryMatches(); });
cron.schedule('0 16 * * *', async () => { await fetchCountryMatches(); });
cron.schedule('0 18 * * *', async () => { await fetchCountryMatches(); });
cron.schedule('0 20 * * *', async () => { await fetchCountryMatches(); });
cron.schedule('0 22 * * *', async () => { await fetchCountryMatches(); });

(async () => {
  console.log('Initial sync');
  await fetchCountryMatches();
})();

// ===============================
// API - THIS FIXES YOUR ERROR
// ===============================
app.get('/apii/matches', async (req, res) => {
  try {
    const tab = req.query.tab || 'upcoming';
    const today = new Date(); today.setUTCHours(0,0,0,0);
    const start = new Date(today); start.setUTCDate(start.getUTCDate() - 3);
    const end = new Date(today); end.setUTCDate(end.getUTCDate() + 3); end.setUTCHours(23,59,59,999);

    let dbMatches = await CountryMatch.find({ match_date: { $gte: start, $lte: end } }).sort({ match_date: 1 }).lean();

    // Filter by tab
    if(tab === 'finished'){
      dbMatches = dbMatches.filter(m => ['FT','AET','PEN'].includes(m.status));
    } else {
      dbMatches = dbMatches.filter(m => ['NS','1H','HT','2H','ET','BT','P','LIVE','INT'].includes(m.status));
    }

    // MAP TO FRONTEND FORMAT
    const formatted = dbMatches.map(m => ({
      id: m.fixture_id,
      league: m.league,
      leagueLogo: m.league_logo,
      date: m.match_date,
      status: ['FT','AET','PEN'].includes(m.status) ? 'FINISHED' : (['1H','HT','2H','ET','P','LIVE','INT'].includes(m.status) ? 'IN_PLAY' : 'SCHEDULED'),
      home: { name: m.home_team, logo: m.home_logo },
      away: { name: m.away_team, logo: m.away_logo },
      homeScore: m.score_home,
      awayScore: m.score_away,
      elapsed: m.elapsed,
      rawStatus: m.status
    }));

    res.json({ success: true, matches: formatted });
  } catch(err){
    res.status(500).json({ success: false, matches: [], error: err.message });
  }
});

app.get('/api/country-matches', async (req, res) => {
  try {
    const today = new Date(); today.setUTCHours(0,0,0,0);
    const start = new Date(today); start.setUTCDate(start.getUTCDate() - 3);
    const end = new Date(today); end.setUTCDate(end.getUTCDate() + 3); end.setUTCHours(23,59,59,999);
    const matches = await CountryMatch.find({ match_date: { $gte: start, $lte: end } }).sort({ match_date: 1 });
    res.json(matches);
  } catch(err){ res.status(500).json([]); }
});

app.get('/api/fetch-now', async (req, res) => {
  await fetchCountryMatches();
  const count = await CountryMatch.countDocuments();
  res.json({ message: 'Done', totalInDB: count });
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
  