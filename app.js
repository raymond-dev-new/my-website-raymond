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


  //football uytryuigddfijoiuytryuihxrtyuihguytrzyuihguytr8987ft

const API_KEY = "1f6245b3640a4f8dbdcd4ef044526b30"; // <-- YOUR API KEY
const API_URL = "https://api.football-data.org/v4"; // football-data.org base
const TIMEZONE = "Africa/Lagos";

//const __filename = fileURLToPath(import.meta.url);
//const __dirname = path.dirname(__filename);


const MatchSchema = new mongoose.Schema({
  _id: String,
  date: Date,
  status: String, // TIMED, IN_PLAY, FINISHED
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

// Helper: call football-data.org
async function api(endpoint, params = {}) {
  const url = new URL(API_URL + endpoint);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));

  const res = await fetch(url, {
    headers: { "X-Auth-Token": API_KEY } // <-- football-data.org uses this
  });
  const data = await res.json();
  if(data.error) throw new Error(data.message);
  return data.matches || []; // football-data returns data.matches
}

// Format football-data.org response to match your frontend
function format(m) {
  return {
    _id: String(m.id),
    date: m.utcDate,
    status: m.status, // TIMED, IN_PLAY, FINISHED
    league: m.competition.name,
    home: {
      name: m.homeTeam.name,
      logo: `https://crests.football-data.org/${m.homeTeam.id}.png` // crest url
    },
    away: {
      name: m.awayTeam.name,
      logo: `https://crests.football-data.org/${m.awayTeam.id}.png`
    },
    homeScore: m.score.fullTime.home,
    awayScore: m.score.fullTime.away
  };
}

async function getMatches(type) {
  let matches = [];

  if (type === "today") {
    const today = getDate();
    matches = await api("/matches", { dateFrom: today, dateTo: today });
  }

  if (type === "upcoming") {
    matches = await api("/matches", { dateFrom: getDate(0), dateTo: getDate(7) });
    matches = matches.filter(m =>!["FINISHED", "POSTPONED", "CANCELED"].includes(m.status));
  }

  if (type === "finished") {
    matches = await api("/matches", { dateFrom: getDate(-7), dateTo: getDate() });
    matches = matches.filter(m => ["FINISHED"].includes(m.status));
  }

  return matches.map(format).sort((a,b) => new Date(a.date) - new Date(b.date));
}

// ROUTES
app.get("/api/matches", async (req, res) => {
  try {
    const matches = await getMatches(req.query.tab);
    res.json({ success: true, matches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/matches/:id", async (req, res) => {
  try {
    const result = await api(`/matches/${req.params.id}`);
    res.json({ success: true, match: format(result) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SERVE FRONTEND
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "../frontend/football.html")));

//kiuytrewertyuioiuytrertyui
  

  app.listen(port, console.log('server is running on port 8000'))
  