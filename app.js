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



// ================= 2. CONFIG - ANTI-BAN FIX =================
// ANTI-BAN 1: Use process.env so your key is hidden
// If you push to GitHub, bots will steal hardcoded key and eat your quota
const API_KEY = process.env.FOOTBALL_API_KEY || "1f6245b3640a4f8dbdcd4ef044526b30";
const API_URL = "https://api.football-data.org/v4";

// ANTI-BAN 2: Lock flag - prevents 2 syncs running at same time
// Without this, if cron overlaps, you do 4 calls at once = 429 ban
let isSyncing = false;

// ================= 3. DATABASE SCHEMA =================
// Schema = structure of match saved in MongoDB
const MatchSchema = new mongoose.Schema({
  _id: String, // ID from football-data.org
  date: Date, // Match date UTC
  status: String, // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED
  minute: Number, // Live minute
  league: String, // Premier League etc
  home: { name: String, logo: String },
  away: { name: String, logo: String },
  homeScore: Number,
  awayScore: Number,
  scorers: [{ // Scorers list - we get this from same /matches call, no extra call
    team: String,
    player: String,
    minute: Number,
    type: String, // REGULAR, PENALTY, OWN_GOAL
    score: String // e.g. "1 - 0"
  }],
  lastUpdated: Date
}, { collection: "newmatches" });

const Match = mongoose.model("Matchnew", MatchSchema);

// ================= 4. HELPERS =================
// Get date string YYYY-MM-DD with offset. -7 = 7 days ago, 0 = today, 7 = 7 days future
function getDate(offset){
  const d = new Date();
  d.setDate(d.getDate() + (offset || 0));
  return d.toISOString().split("T")[0];
}

// Main function to call football-data.org API
async function callAPI(endpoint, params = {}){
  const apiUrl = new URL(API_URL + endpoint);
  for (let k in params) apiUrl.searchParams.set(k, params[k]); // Add dateFrom, dateTo etc

  const res = await fetch(apiUrl, { headers: { "X-Auth-Token": API_KEY } });
  const data = await res.json();

  // Handle rate limit error
  if (!res.ok){
    if(res.status === 429) throw new Error("Rate limit 429 - you called too fast, wait 1 min");
    throw new Error(data.message || "API Error " + res.status);
  }
  return data;
}

// Convert football-data.org format to our DB format
function formatMatch(m){
  // Score logic: use fullTime for finished, live for live games
  let homeScore = m.score?.fullTime?.home?? m.score?.halfTime?.home?? 0;
  let awayScore = m.score?.fullTime?.away?? m.score?.halfTime?.away?? 0;

  // If game is live, use live score
  if(m.status === "IN_PLAY" || m.status === "PAUSED"){
    homeScore = m.score?.live?.home?? homeScore;
    awayScore = m.score?.live?.away?? awayScore;
  }

  // Scorers - IMPORTANT: This is inside /matches response, NO extra API call = safe from ban
  let scorers = [];
  if(m.goals && m.goals.length > 0){
    scorers = m.goals.map(g => ({
      team: g.team?.name || "",
      player: g.scorer?.name || "Unknown",
      minute: g.minute,
      type: g.type || "REGULAR",
      score: g.score? `${g.score.home} - ${g.score.away}` : ""
    }));
  }

  return {
    _id: String(m.id),
    date: new Date(m.utcDate),
    status: m.status,
    minute: m.minute || null,
    league: m.competition?.name || "Football",
    home: { name: m.homeTeam?.name || "Home", logo: m.homeTeam?.id? `https://crests.football-data.org/${m.homeTeam.id}.png` : "" },
    away: { name: m.awayTeam?.name || "Away", logo: m.awayTeam?.id? `https://crests.football-data.org/${m.awayTeam.id}.png` : "" },
    homeScore, awayScore,
    scorers,
    lastUpdated: new Date()
  };
}

// ================= 5. FULL SYNC - 7 DAYS BACK + 7 DAYS FRONT =================
// This is the main sync that gets all matches
// football-data.org only allows 10 days per call, so we split into 2 calls
async function fullSync(){
  // ANTI-BAN: If already syncing, skip - prevents double calls
  if(isSyncing){
    console.log("[SKIP] Already syncing, skipping to avoid ban");
    return 0;
  }
  isSyncing = true; // Lock

  const today = getDate(0);
  const fromBack = getDate(-7); // 7 days ago
  const toFront = getDate(7); // 7 days future
  const nowWAT = new Date().toLocaleString("en-NG", {timeZone: "Africa/Lagos"});

  console.log(`[FULL SYNC START] ${nowWAT} WAT - 2 calls: ${fromBack} to ${today} AND ${today} to ${toFront}`);

  try{
    // CALL 1: Past 7 days - for finished tab
    const data1 = await callAPI("/matches", { dateFrom: fromBack, dateTo: today });
    console.log(`[SYNC 1] Got ${data1.matches?.length || 0} matches from past 7 days`);

    // ANTI-BAN: Wait 7 seconds between calls - keeps you at 8 calls/min (limit 10)
    await new Promise(r => setTimeout(r, 7000));

    // CALL 2: Next 7 days - for upcoming tab
    const data2 = await callAPI("/matches", { dateFrom: today, dateTo: toFront });
    console.log(`[SYNC 2] Got ${data2.matches?.length || 0} matches from next 7 days`);

    // Merge both results and remove duplicate (today appears in both)
    const allMatches = [...(data1.matches || []),...(data2.matches || [])];
    const uniqueMap = new Map();
    allMatches.forEach(m => uniqueMap.set(m.id, m));
    const uniqueList = Array.from(uniqueMap.values());

    if(uniqueList.length === 0){
      console.log("[SYNC] No matches in both ranges - international break");
      return 0;
    }

    // Save all to MongoDB at once
    const formatted = uniqueList.map(formatMatch);
    const ops = formatted.map(m => ({ updateOne: { filter: { _id: m._id }, update: { $set: m }, upsert: true } }));
    await Match.bulkWrite(ops, {ordered:false});

    console.log(`[SYNCED] ${formatted.length} matches at ${nowWAT} WAT`);
    return formatted.length;

  }catch(e){
    console.log("[SYNC ERROR]", e.message);
  } finally {
    isSyncing = false; // Always unlock even if error
  }
}

// ================= 6. LIVE SYNC - ONLY WHEN GAMES ARE LIVE =================
// This checks DB for IN_PLAY games and updates live scores
async function liveSync(){
  const liveInDb = await Match.find({ status: { $in: ["IN_PLAY","PAUSED"] } });

  // ANTI-BAN: If 0 live games, make 0 API calls and exit
  if(liveInDb.length === 0) return;

  // ANTI-BAN: If too many live games (>15), skip this round to avoid 10/min limit
  if(liveInDb.length > 15){
    console.log(`[LIVE SKIP] ${liveInDb.length} live games too many, skip to avoid ban`);
    return;
  }

  console.log(`[LIVE SYNC] ${liveInDb.length} live games - using ${liveInDb.length} API calls`);

  for(let match of liveInDb){
    try{
      const data = await callAPI(`/matches/${match._id}`); // 1 call per live game
      const formatted = formatMatch(data);
      await Match.updateOne({ _id: match._id }, { $set: formatted });

      // ANTI-BAN: Wait 7 sec between each live game - keeps you safe
      await new Promise(r => setTimeout(r, 7000));

    }catch(e){
      console.log("live error", e.message);
    }
  }
}

// ================= 7. ROUTES =================
// Route for ads.txt - needed for AdSense
app.get('/ads.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, 'frontend', 'ads.txt'));
});

// Route for homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'mainpage.html'));
});

// API route: Frontend calls /api/matches?tab=upcoming or finished or live
app.get("/api/matches", async (req, res) => {
  try{
    const tab = req.query.tab || "upcoming";
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
    const in7Days = new Date(today); in7Days.setDate(today.getDate()+7);
    const ago7Days = new Date(today); ago7Days.setDate(today.getDate()-7);

    let filter = {};
    let sort = { date: 1 };

    // Upcoming: next 7 days, SCHEDULED, TIMED, IN_PLAY
    if(tab === "upcoming"){
      filter = { date: { $gte: today, $lte: in7Days }, status: { $in: ["SCHEDULED","TIMED","IN_PLAY","PAUSED"] } };
      sort = { date: 1 };
    }
    // Finished: last 7 days, FINISHED only
    if(tab === "finished"){
      filter = { status: "FINISHED", date: { $gte: ago7Days, $lt: tomorrow } };
      sort = { date: -1 };
    }
    // Live: only IN_PLAY
    if(tab === "live"){
      filter = { status: { $in: ["IN_PLAY","PAUSED"] } };
    }

    const matches = await Match.find(filter).sort(sort);
    res.json({ success: true, matches });

  }catch(err){
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= 8. CRON JOBS - 10 TIMES PER DAY =================
// These times are UTC, but log shows WAT (Lagos) time
// 10 crons x 2 calls each = 20 calls/day = VERY SAFE (limit 10/min)
const syncTimesUTC = [
  "50 12 * * *", // 13:50 WAT
  "14 15 * * *", // 16:14 WAT
  "38 17 * * *", // 18:38 WAT
  "2 20 * * *", // 21:02 WAT
  "26 22 * * *", // 23:26 WAT
  "50 0 * * *", // 01:50 WAT next day
  "14 3 * * *", // 04:14 WAT
  "38 5 * * *", // 06:38 WAT
  "2 8 * * *", // 09:02 WAT
  "26 10 * * *" // 11:26 WAT
];

syncTimesUTC.forEach(time => {
  cron.schedule(time, async () => {
    const nowWAT = new Date().toLocaleString("en-NG", {timeZone: "Africa/Lagos"});
    console.log(`[CRON 10x] Auto sync at ${nowWAT} WAT (${time} UTC)`);
    try{ await fullSync(); }catch(e){ console.log("cron fail", e.message); }
  }, { timezone: "UTC" });
});

// Live sync cron: Every 2 mins, but 0 calls if no live games in DB
cron.schedule("*/2 * * * *", async () => {
  try{ await liveSync(); }catch(e){ console.log("live cron fail", e.message); }
});

// Initial sync when server starts, after 5 seconds
setTimeout(async () => {
  console.log("🚀 Initial auto sync starting...");
  try{ await fullSync(); }catch(e){}
}, 5000);


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
  