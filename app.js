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
// Your API key and base URL for football-data.org
const API_KEY = "1f6245b3640a4f8dbdcd4ef044526b30";
const API_URL = "https://api.football-data.org/v4";

// Lock to prevent 2 syncs running at same time (anti-ban)
let isSyncing = false;

// ================= 3. DATABASE SCHEMA =================
// This is how match will be saved in MongoDB
const MatchSchema = new mongoose.Schema({
  _id: String, // ID from football-data.org, we use as MongoDB ID
  date: Date, // Match kickoff time in UTC
  status: String, // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED etc
  minute: Number, // Current minute e.g 67
  minuteText: String, // Display text e.g "67'" or "HT"
  league: String, // Competition name e.g Premier League
  home: { name: String, logo: String }, // Home team info
  away: { name: String, logo: String }, // Away team info
  homeScore: Number, // Home goals
  awayScore: Number // Away goals
});
const Match = mongoose.model("Match", MatchSchema);

// ================= 4. HELPER: GET DATE =================
// Returns date string YYYY-MM-DD with offset
// 0 = today, -7 = 7 days ago, 7 = 7 days future
function getDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

// ================= 5. HELPER: CALL API =================
// This function calls football-data.org API with your token
async function api(endpoint, params = {}) {
  // Build full URL e.g https://api.football-data.org/v4/matches?dateFrom=2026-09-17
  const url = new URL(API_URL + endpoint);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  // Make request with auth token
  const response = await fetch(url, {
    headers: { "X-Auth-Token": API_KEY }
  });

  const data = await response.json();
  // If API returns error (like 429 rate limit), throw it
  if (!response.ok) {
    throw new Error(data.message || `Football API error: ${response.status}`);
  }
  return data;
}

// ================= 6. HELPER: CALCULATE LIVE MINUTE =================
// This calculates live minute display
function calculateMinute(date, status, apiMinute) {
  // If game is on half-time break, show HT
  if (status === "PAUSED") return { minute: 45, minuteText: "HT" };
  // If not live, return null (no minute)
  if (status!== "IN_PLAY") return { minute: null, minuteText: null };

  // 1. Use real API minute if available - best option
  if (typeof apiMinute === "number" && apiMinute > 0) {
    return { minute: apiMinute, minuteText: `${apiMinute}'` };
  }

  // 2. Fallback: Calculate from kickoff time if API minute missing
  const kickoff = new Date(date).getTime();
  const now = Date.now();
  let elapsed = Math.floor((now - kickoff) / 60000); // Convert ms to minutes
  if (elapsed < 1) elapsed = 1;

  if (elapsed <= 45) return { minute: elapsed, minuteText: `${elapsed}'` }; // First half

  const secondHalfMinute = elapsed - 15; // remove 15min HT break
  if (secondHalfMinute > 45 && secondHalfMinute <= 90) {
    return { minute: secondHalfMinute, minuteText: `${secondHalfMinute}'` }; // Second half
  }

  if (elapsed > 105) return { minute: 90, minuteText: "FINISH" };
  return { minute: 90, minuteText: "90+'" };
}

// ================= 7. HELPER: FORMAT MATCH =================
// Converts football-data.org format to our DB format
function format(m) {
  const liveClock = calculateMinute(m.utcDate, m.status, m.minute);

  return {
    _id: String(m.id), // Convert ID to string for MongoDB
    date: m.utcDate, // Keep original UTC date
    status: m.status, // Keep status
    minute: liveClock.minute, // Calculated minute
    minuteText: liveClock.minuteText, // Calculated display text
    league: m.competition?.name || "Football", // Competition name
    home: {
      name: m.homeTeam?.name || "Home",
      logo: m.homeTeam?.id? `https://crests.football-data.org/${m.homeTeam.id}.png` : "https://via.placeholder.com/40"
    },
    away: {
      name: m.awayTeam?.name || "Away",
      logo: m.awayTeam?.id? `https://crests.football-data.org/${m.awayTeam.id}.png` : "https://via.placeholder.com/40"
    },
    homeScore: m.score?.fullTime?.home?? m.score?.halfTime?.home?? 0, // Use fullTime, fallback to halfTime
    awayScore: m.score?.fullTime?.away?? m.score?.halfTime?.away?? 0
  };
}

// ================= 8. HELPER: GET SINGLE LIVE MATCH =================
// This fetches one live match by ID to get fresh score/minute - 1 API call
async function getMatchWithMinute(id) {
  try {
    const data = await api(`/matches/${id}`);
    if (!data.match) return null;
    return format(data.match);
  } catch (error) {
    return null; // If error, return null, don't crash
  }
}

// ================= 9. NEW: SYNC TO DATABASE (5 TIMES PER DAY) =================
// This is the main function that runs 5 times per day and saves to DB
// It does 2 calls: 7 days back + 7 days front = 14 days total
async function fullSyncToDB(){
  // If already syncing, skip to avoid double calls and ban
  if(isSyncing){
    console.log("[SKIP] Already syncing");
    return;
  }
  isSyncing = true; // Lock

  const nowWAT = new Date().toLocaleString("en-NG", {timeZone: "Africa/Lagos"});
  console.log(`[SYNC START] ${nowWAT} WAT - 5x per day mode`);

  try{
    // CALL 1: Last 7 days (for finished tab) - 1st API call
    const finishedData = await api("/matches", { dateFrom: getDate(-7), dateTo: getDate() });
    console.log(`[SYNC 1] Finished: ${finishedData.matches?.length || 0} matches`);

    // ANTI-BAN: Wait 7 seconds before next call - keeps speed at 8 calls/min (limit is 10/min)
    await new Promise(r => setTimeout(r, 7000));

    // CALL 2: Next 7 days (for today + upcoming tab) - 2nd API call
    const upcomingData = await api("/matches", { dateFrom: getDate(), dateTo: getDate(7) });
    console.log(`[SYNC 2] Upcoming: ${upcomingData.matches?.length || 0} matches`);

    // Merge both and remove duplicates
    const allMatches = [...(finishedData.matches || []),...(upcomingData.matches || [])];
    const uniqueMap = new Map();
    allMatches.forEach(m => uniqueMap.set(m.id, m));
    const uniqueList = Array.from(uniqueMap.values());

    // Format all matches using your original format() function
    const formatted = uniqueList.map(format);

    // Save to MongoDB - bulkWrite = save all at once, fast
    if(formatted.length > 0){
      const ops = formatted.map(m => ({
        updateOne: {
          filter: { _id: m._id }, // Find by ID
          update: { $set: m }, // Update data
          upsert: true // Create if not exists
        }
      }));
      await Match.bulkWrite(ops, {ordered:false});
      console.log(`[SYNCED] ${formatted.length} matches saved to DB`);
    }

  }catch(e){
    console.log("[SYNC ERROR]", e.message);
  }finally{
    isSyncing = false; // Always unlock
  }
}

// ================= 10. YOUR ORIGINAL GETMATCHES BUT NOW READS FROM DB =================
// This is your original function, but modified to read from DB (not call API every time)
// This is how we achieve 5x per day - frontend reads DB, cron updates DB
async function getMatches(type) {
  let filter = {};

  // Build filter based on tab - this is your original logic but for DB
  if (type === "today") {
    // Today: filter matches where date is today
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    filter = { date: { $gte: todayStart, $lte: todayEnd } };
  }

  if (type === "upcoming") {
    // Upcoming: next 7 days, not finished
    filter = {
      date: { $gte: new Date(getDate()), $lte: new Date(getDate(7)) },
      status: { $in: ["SCHEDULED","TIMED","IN_PLAY","PAUSED"] }
    };
  }

  if (type === "finished") {
    // Finished: last 7 days, only finished
    filter = {
      date: { $gte: new Date(getDate(-7)), $lte: new Date() },
      status: "FINISHED"
    };
  }

  // Read from DB instead of calling API
  let formatted = await Match.find(filter).lean();

  // Sort: LIVE first (your original sorting logic)
  formatted.sort((a, b) => {
    const liveA = a.status === "IN_PLAY" || a.status === "PAUSED";
    const liveB = b.status === "IN_PLAY" || b.status === "PAUSED";
    if (liveA &&!liveB) return -1;
    if (!liveA && liveB) return 1;
    return new Date(a.date) - new Date(b.date);
  });

  return formatted;
}

// ================= 11. API ROUTE =================
// Frontend calls this: /api/matches?tab=today or upcoming or finished
// Now it reads from DB (fast, no API call), not directly from football-data.org
app.get("/api/matches", async (req, res) => {
  try {
    const tab = req.query.tab || "today"; // Default to today
    const matches = await getMatches(tab); // Get from DB
    res.json({ success: true, matches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================= 12. CRON: 5 TIMES PER DAY =================
// 5 times per day = 5 x 2 calls = 10 calls/day total = VERY SAFE
// These times are in UTC, but we log in WAT (Lagos time)
const syncTimesUTC = [
  "50 0 * * *", // 01:50 WAT - early morning
  "38 5 * * *", // 06:38 WAT - morning
  "26 10 * * *", // 11:26 WAT - noon
  "14 15 * * *", // 16:14 WAT - afternoon
  "2 20 * * *", // 21:02 WAT - night
];

syncTimesUTC.forEach(time => {
  cron.schedule(time, async () => {
    const nowWAT = new Date().toLocaleString("en-NG", {timeZone: "Africa/Lagos"});
    console.log(`[CRON 5x] Running sync at ${nowWAT} WAT`);
    try{ await fullSyncToDB(); }catch(e){ console.log("cron fail", e.message); }
  }, { timezone: "UTC" });
});

// Initial sync when server starts, after 5 seconds
setTimeout(async () => {
  console.log("🚀 Initial sync starting...");
  try{ await fullSyncToDB(); }catch(e){}
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
  