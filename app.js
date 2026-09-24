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


const API_KEY = process.env.FOOTBALL_API_KEY || "1f6245b3640a4f8dbdcd4ef044526b30";
const API_URL = "https://api.football-data.org/v4";
let isSyncing = false;

const MatchSchema = new mongoose.Schema({
  _id: String, date: Date, status: String, minute: Number, league: String,
  home: { name: String, logo: String }, away: { name: String, logo: String },
  homeScore: Number, awayScore: Number,
  scorers: [{ team: String, player: String, minute: Number, type: String, score: String }],
  lastUpdated: Date
}, { collection: "newmatches" });

MatchSchema.index({ date: 1, status: 1 }); // FAST INDEX
const Match = mongoose.model("Matchh", MatchSchema);

function getDate(offset){ const d=new Date(); d.setDate(d.getDate()+(offset||0)); return d.toISOString().split("T")[0]; }
async function callAPI(endpoint, params={}){ const u=new URL(API_URL+endpoint); for(let k in params) u.searchParams.set(k, params[k]); const res=await fetch(u,{headers:{"X-Auth-Token":API_KEY}}); const data=await res.json(); if(!res.ok) throw new Error(data.message||"API Error "+res.status); return data; }
function formatMatch(m){ let hs=m.score?.fullTime?.home??m.score?.halfTime?.home??0; let as=m.score?.fullTime?.away??m.score?.halfTime?.away??0; if(m.status==="IN_PLAY"||m.status==="PAUSED"){ hs=m.score?.live?.home??hs; as=m.score?.live?.away??as; } let scorers=[]; if(m.goals?.length>0){ scorers=m.goals.map(g=>({team:g.team?.name||"",player:g.scorer?.name||"Unknown",minute:g.minute,type:g.type||"REGULAR",score:g.score?`${g.score.home} - ${g.score.away}`:""})); } return {_id:String(m.id),date:new Date(m.utcDate),status:m.status,minute:m.minute||null,league:m.competition?.name||"Football",home:{name:m.homeTeam?.name||"Home",logo:m.homeTeam?.id?`https://crests.football-data.org/${m.homeTeam.id}.png`:""},away:{name:m.awayTeam?.name||"Away",logo:m.awayTeam?.id?`https://crests.football-data.org/${m.awayTeam.id}.png`:""},homeScore:hs,awayScore:as,scorers,lastUpdated:new Date()}; }

async function fullSync(){
  if(isSyncing) return 0; isSyncing=true;
  const today=getDate(0), fromBack=getDate(-7), toFront=getDate(7);
  const nowWAT=new Date().toLocaleString("en-NG",{timeZone:"Africa/Lagos"});
  console.log(`[FULL SYNC] ${nowWAT} - ${fromBack} to ${toFront}`);
  try{
    const data1=await callAPI("/matches",{dateFrom:fromBack,dateTo:today});
    await new Promise(r=>setTimeout(r,7000));
    const data2=await callAPI("/matches",{dateFrom:today,dateTo:toFront});
    const all=[...(data1.matches||[]),...(data2.matches||[])]; const map=new Map(); all.forEach(m=>map.set(m.id,m));
    const formatted=Array.from(map.values()).map(formatMatch);
    if(formatted.length>0){ await Match.bulkWrite(formatted.map(m=>({updateOne:{filter:{_id:m._id},update:{$set:m},upsert:true}})),{ordered:false}); console.log(`[SYNCED] ${formatted.length}`); }
    return formatted.length;
  }catch(e){ console.log("[SYNC ERROR]", e.message); } finally{ isSyncing=false; }
}
async function liveSync(){ const live=await Match.find({status:{$in:["IN_PLAY","PAUSED"]}}); if(live.length===0||live.length>15) return; for(let m of live){ try{ const d=await callAPI(`/matches/${m._id}`); await Match.updateOne({_id:m._id},{$set:formatMatch(d)}); await new Promise(r=>setTimeout(r,7000)); }catch(e){} } }

// FAST API - KEEPS 7 DAYS BACK AND FRONT
app.get("/api/matches", async (req,res)=>{
  try{
    const tab=req.query.tab||"upcoming";
    const today=new Date(); today.setHours(0,0,0,0);
    const tomorrow=new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const in7Days=new Date(today); in7Days.setDate(in7Days.getDate()+7);
    const ago7Days=new Date(today); ago7Days.setDate(ago7Days.getDate()-7);
    let filter={}, sort={date:1};
    if(tab==="upcoming"){ filter={date:{$gte:today,$lte:in7Days}, status:{$in:["SCHEDULED","TIMED","IN_PLAY","PAUSED"]}}; sort={date:1}; }
    if(tab==="finished"){ filter={status:"FINISHED", date:{$gte:ago7Days,$lt:tomorrow}}; sort={date:-1}; }
    if(tab==="live"){ filter={status:{$in:["IN_PLAY","PAUSED"]}}; }
    const matches=await Match.find(filter).sort(sort).limit(150).lean(); // limit for speed, still 7 days
    console.log(`[API] tab=${tab} -> ${matches.length} (7 days range)`);
    res.json({success:true, matches});
  }catch(err){ console.error(err.message); res.json({success:true, matches:[]}); }
});

app.get("/", (req,res)=>res.send("API Running"));
const syncTimesUTC=["50 12 * * *","14 15 * * *","38 17 * * *","26 22 * * *","50 0 * * *","38 5 * * *","2 8 * * *","26 10 * * *"];
syncTimesUTC.forEach(t=>{ cron.schedule(t, ()=>fullSync(), {timezone:"UTC"}); });
cron.schedule("*/2 * * * *", ()=>liveSync());
setTimeout(()=>fullSync(), 5000);


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
  