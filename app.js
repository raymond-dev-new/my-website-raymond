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
app.use(cors({ origin: "*",
  methods: ["GET", "POST" , "DELETE"]
 }));

app.use(cors({ origin: "*" }));
app.use(bordyparser.json()); // for metadata
//app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.json({ limit: '10mb' })); // increase limit for big metadata
 app.use(express.static(path.join(__dirname, 'frontend')))

 //start her sdfyuiopiuytrewrtyuiopoiuytretkjhgf

    // 1. CONNECT MONGODB with Mongoose
mongoose.connect(url)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// 2. CLOUDINARY CONFIG - optional if you upload from frontend
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});


// SCHEMA
const mediaSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true }, // image or video
  public_id: { type: String, required: true },
  moderation_status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const Media = mongoose.model('Media', mediaSchema);


// ROUTES

// 1. GET ALL MEDIA FOR USER
app.get('/api/get-media', async (req, res) => {
  try {
    const { userId } = req.query;
    if(!userId) return res.status(400).json({ error: 'userId required' });
    
    const mediaList = await Media.find({ userId }).sort({ createdAt: -1 });
    res.json(mediaList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// 2. SAVE MEDIA - WITH AUTO MODERATION CHECK
app.post('/api/save-media', async (req, res) => {
  try {
    const { userId, url, type, public_id } = req.body;
    if(!userId ||!url ||!type ||!public_id) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // CHECK CLOUDINARY MODERATION STATUS
    try {
      const resource = await cloudinary.api.resource(public_id, { 
        resource_type: type 
      });

      // If Cloudinary flagged it
      if(resource.moderation && resource.moderation[0].status === 'rejected'){
        console.log("NSFW DETECTED, DELETING:", public_id);
        await cloudinary.uploader.destroy(public_id, { resource_type: type });
        return res.json({ blocked: true, reason: 'NSFW content detected by Cloudinary' });
      }
    } catch(cloudErr) {
      console.log("Cloudinary check failed, saving anyway:", cloudErr.message);
    }

    // SAVE TO DB IF SAFE
    const newMedia = new Media({ userId, url, type, public_id, moderation_status: 'approved' });
    await newMedia.save();
    
    res.json({ ok: 1, data: newMedia });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// 3. DELETE FROM DB
app.delete('/api/delete-media/:id', async (req, res) => {
  try {
    await Media.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// 4. DELETE FROM CLOUDINARY - for flagged files
app.post('/api/delete-cloudinary', async (req, res) => {
  try {
    const { public_id, type } = req.body;
    if(!public_id) return res.status(400).json({ error: 'public_id required' });
    
    await cloudinary.uploader.destroy(public_id, { resource_type: type || 'image' });
    res.json({ ok: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

 //end here kuytrewrtyuiyutrsdfgufdfguigfd
 

  let token = '';

 let User = '';

  app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'register.html'));
 }) 



 app.post('/change', async (req, res) => {
   console.log(req.body)
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

/*
const API_KEY = "1f6245b3640a4f8dbdcd4ef044526b30";
const API_URL = "https://api.football-data.org/v4";



const MatchSchema = new mongoose.Schema({
  _id: String,
  date: Date,
  status: String,
  minute: Number,
  minuteText: String,
  league: String,
  home: { name: String, logo: String },
  away: { name: String, logo: String },
  homeScore: Number,
  awayScore: Number
});
const Match = mongoose.model("Match", MatchSchema);


function getDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}


async function api(endpoint, params = {}) {
  const url = new URL(API_URL + endpoint);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: { "X-Auth-Token": API_KEY }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Football API error: ${response.status}`);
  }
  return data;
}


function calculateMinute(date, status, apiMinute) {
  if (status === "PAUSED") return { minute: 45, minuteText: "HT" };
  if (status!== "IN_PLAY") return { minute: null, minuteText: null };

  // 1. Use real API minute if available
  if (typeof apiMinute === "number" && apiMinute > 0) {
    return { minute: apiMinute, minuteText: `${apiMinute}'` };
  }

  // 2. Fallback: Calculate from kickoff
  const kickoff = new Date(date).getTime();
  const now = Date.now();
  let elapsed = Math.floor((now - kickoff) / 60000);
  if (elapsed < 1) elapsed = 1;

  if (elapsed <= 45) return { minute: elapsed, minuteText: `${elapsed}'` }; // 1H

  const secondHalfMinute = elapsed - 15; // remove 15min HT
  if (secondHalfMinute > 45 && secondHalfMinute <= 90) {
    return { minute: secondHalfMinute, minuteText: `${secondHalfMinute}'` }; // 2H
  }

  if (elapsed > 105) return { minute: 90, minuteText: "FINISH" };
  return { minute: 90, minuteText: "90+'" };
}


function format(m) {
  const liveClock = calculateMinute(m.utcDate, m.status, m.minute);

  return {
    _id: String(m.id),
    date: m.utcDate,
    status: m.status,
    minute: liveClock.minute,
    minuteText: liveClock.minuteText,
    league: m.competition?.name || "Football",
    home: {
      name: m.homeTeam?.name || "Home",
      logo: m.homeTeam?.id? `https://crests.football-data.org/${m.homeTeam.id}.png` : "https://via.placeholder.com/40"
    },
    away: {
      name: m.awayTeam?.name || "Away",
      logo: m.awayTeam?.id? `https://crests.football-data.org/${m.awayTeam.id}.png` : "https://via.placeholder.com/40"
    },
    homeScore: m.score?.fullTime?.home?? m.score?.halfTime?.home?? 0,
    awayScore: m.score?.fullTime?.away?? m.score?.halfTime?.away?? 0
  };
}


async function getMatchWithMinute(id) {
  try {
    const data = await api(`/matches/${id}`);
    if (!data.match) return null;
    return format(data.match);
  } catch (error) {
    return null;
  }
}


async function getMatches(type) {
  let matches = [];

  if (type === "today") {
    const today = getDate();
    const data = await api("/matches", { dateFrom: today, dateTo: today });
    matches = data.matches || [];
  }

  if (type === "upcoming") {
    const data = await api("/matches", { dateFrom: getDate(), dateTo: getDate(7) });
    matches = (data.matches || []).filter(m =>!["FINISHED", "POSTPONED", "CANCELED"].includes(m.status));
  }

  if (type === "finished") {
    const data = await api("/matches", { dateFrom: getDate(-7), dateTo: getDate() });
    matches = (data.matches || []).filter(m => m.status === "FINISHED");
  }

  let formatted = matches.map(format);

  // Update live matches with fresh data
  const liveMatches = formatted.filter(m => m.status === "IN_PLAY" || m.status === "PAUSED");
  if (liveMatches.length > 0) {
    const updated = await Promise.all(liveMatches.map(m => getMatchWithMinute(m._id)));
    updated.forEach(um => {
      if (!um) return;
      const index = formatted.findIndex(m => m._id === um._id);
      if (index!== -1) formatted[index] = um;
    });
  }

  // Sort: LIVE first
  formatted.sort((a, b) => {
    const liveA = a.status === "IN_PLAY" || a.status === "PAUSED";
    const liveB = b.status === "IN_PLAY" || b.status === "PAUSED";
    if (liveA &&!liveB) return -1;
    if (!liveA && liveB) return 1;
    return new Date(a.date) - new Date(b.date);
  });

  return formatted;
}


app.get("/api/matches", async (req, res) => {
  try {
    const tab = req.query.tab || "today";
    const matches = await getMatches(tab);
    res.json({ success: true, matches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


app.use(express.static(path.join(__dirname, "../frontend")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/football.html"));
}); */






const API_KEY = "1f6245b3640a4f8dbdcd4ef044526b30";
const API_URL = "https://api.football-data.org/v4";

/* =========================
   MONGO SCHEMA
========================= */
const MatchSchema = new mongoose.Schema({
  _id: String,
  date: Date,
  status: String,
  minute: Number,
  minuteText: String,
  league: String,
  home: { name: String, logo: String },
  away: { name: String, logo: String },
  homeScore: Number,
  awayScore: Number,
  homeLineup: [String], // NEW
  awayLineup: [String] // NEW
}, { timestamps: true });
const Match = mongoose.model("Match", MatchSchema);

/* =========================
   DATE
========================= */
function getDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

/* =========================
   FOOTBALL API
========================= */
async function api(endpoint, params = {}) {
  const url = new URL(API_URL + endpoint);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: { "X-Auth-Token": API_KEY }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Football API error: ${response.status}`);
  }
  return data;
}

/* =========================
   LIVE MINUTE CALCULATOR
========================= */
function calculateMinute(date, status, apiMinute) {
  if (status === "PAUSED") return { minute: 45, minuteText: "HT" };
  if (status!== "IN_PLAY") return { minute: null, minuteText: null };

  if (typeof apiMinute === "number" && apiMinute > 0) {
    return { minute: apiMinute, minuteText: `${apiMinute}'` };
  }

  const kickoff = new Date(date).getTime();
  const now = Date.now();
  let elapsed = Math.floor((now - kickoff) / 60000);
  if (elapsed < 1) elapsed = 1;

  if (elapsed <= 45) return { minute: elapsed, minuteText: `${elapsed}'` };

  const secondHalfMinute = elapsed - 15;
  if (secondHalfMinute > 45 && secondHalfMinute <= 90) {
    return { minute: secondHalfMinute, minuteText: `${secondHalfMinute}'` };
  }

  if (elapsed > 105) return { minute: 90, minuteText: "FINISH" };
  return { minute: 90, minuteText: "90+'" };
}

/* =========================
   FORMAT MATCH
========================= */
function format(m) {
  const liveClock = calculateMinute(m.utcDate, m.status, m.minute);

  const homeLineup = m.homeTeam?.lineup?.map(p => p.player.name) || [];
  const awayLineup = m.awayTeam?.lineup?.map(p => p.player.name) || [];

  return {
    _id: String(m.id),
    date: m.utcDate,
    status: m.status,
    minute: liveClock.minute,
    minuteText: liveClock.minuteText,
    league: m.competition?.name || "Football",
    home: {
      name: m.homeTeam?.name || "Home",
      logo: m.homeTeam?.id? `https://crests.football-data.org/${m.homeTeam.id}.png` : "https://via.placeholder.com/40"
    },
    away: {
      name: m.awayTeam?.name || "Away",
      logo: m.awayTeam?.id? `https://crests.football-data.org/${m.awayTeam.id}.png` : "https://via.placeholder.com/40"
    },
    homeScore: m.score?.fullTime?.home?? m.score?.halfTime?.home?? 0,
    awayScore: m.score?.fullTime?.away?? m.score?.halfTime?.away?? 0,
    homeLineup,
    awayLineup
  };
}

/* =========================
   GET SINGLE MATCH WITH CACHING
========================= */
async function getMatchWithMinute(id) {
  try {
    // 1. Check DB first. If we have lineup already, return it
    const cached = await Match.findById(id);
    if(cached && cached.homeLineup && cached.homeLineup.length > 0){
      return cached.toObject();
    }

    // 2. Fetch fresh from API
    const data = await api(`/matches/${id}`);
    if (!data.match) return null;
    const formatted = format(data.match);

    // 3. Save to DB so we keep it
    await Match.findByIdAndUpdate(id, formatted, { upsert: true, new: true });
    return formatted;
  } catch (error) {
    console.log("Error fetching match", id, error.message);
    return null;
  }
}

/* =========================
   GET MATCHES
========================= */
async function getMatches(type) {
  let matches = [];

  if (type === "today") {
    const today = getDate();
    const data = await api("/matches", { dateFrom: today, dateTo: today });
    matches = data.matches || [];
  }

  if (type === "upcoming") {
    const data = await api("/matches", { dateFrom: getDate(), dateTo: getDate(7) });
    matches = (data.matches || []).filter(m =>!["FINISHED", "POSTPONED", "CANCELED"].includes(m.status));
  }

  if (type === "finished") {
    const data = await api("/matches", { dateFrom: getDate(-7), dateTo: getDate() });
    matches = (data.matches || []).filter(m => m.status === "FINISHED");
  }

  let formatted = matches.map(format);

  // Only fetch details for LIVE + FINISHED in last 3 days to avoid rate limit
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const matchesToUpdate = formatted.filter(m => {
    const matchDate = new Date(m.date);
    const isRecent = matchDate >= threeDaysAgo;
    return (m.status === "IN_PLAY" || m.status === "PAUSED" || (m.status === "FINISHED" && isRecent));
  });

  if (matchesToUpdate.length > 0) {
    const updated = await Promise.all(matchesToUpdate.map(m => getMatchWithMinute(m._id)));
    updated.forEach(um => {
      if (!um) return;
      const index = formatted.findIndex(m => m._id === um._id);
      if (index!== -1) formatted[index] = um;
    });
  }

  // Sort: LIVE first
  formatted.sort((a, b) => {
    const liveA = a.status === "IN_PLAY" || a.status === "PAUSED";
    const liveB = b.status === "IN_PLAY" || b.status === "PAUSED";
    if (liveA &&!liveB) return -1;
    if (!liveA && liveB) return 1;
    return new Date(a.date) - new Date(b.date);
  });

  return formatted;
}

/* =========================
   ROUTES
========================= */
app.get("/api/matches", async (req, res) => {
  try {
    const tab = req.query.tab || "today";
    const matches = await getMatches(tab);
    res.json({ success: true, matches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* =========================
   FRONTEND
========================= */
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/football.html"));
});



//kiuytrewertyuioiuytrertyui
  

  app.listen(port, console.log('server is running on port 8000'))
  