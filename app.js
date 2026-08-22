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
/*
const API_KEY = "7e5ce14b39183f3ecb2a089da5aa245b"; 
const TEAMS = [42, 50, 541, 529, 40, 33, 157]; // Arsenal, City, Real, Barca, Liverpool, ManU, Bayern

app.get("/api/matches", async (req, res) => {
  try {
    let allMatches = [];
    
    // LOOP 3 DAYS BACK TO 3 DAYS FORWARD
    for(let i = -7; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      
      console.log("Fetching:", dateStr);
      const url = `https://v3.football.api-sports.io/fixtures?date=${dateStr}`;
      
      const response = await fetch(url, { headers: { "x-apisports-key": API_KEY }});
      const data = await response.json();
      
      if(!data.errors || Object.keys(data.errors).length === 0) {
        const filtered = data.response.filter(m => 
          TEAMS.includes(m.teams.home.id) || TEAMS.includes(m.teams.away.id)
        );
        allMatches = allMatches.concat(filtered);
      }
    }
    
    console.log("Total real matches found:", allMatches.length);
    
    // IF API IS EMPTY, ADD MOCK DATA FOR 3 DAYS BACK, TODAY, 3 DAYS FORWARD
   

  if(allMatches.length === 0) {
  const baseDate = new Date();
  allMatches = [];

  // Generate matches for -3 days to +3 days
  for(let i = -3; i <= 3; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const day = d.toISOString().split('T')[0];

    // Define times for this day
    const t730pm = `${day}T19:30:00+01:00`;
    const t735pm = `${day}T19:35:00+01:00`;
    const t8pm = `${day}T20:00:00+01:00`;
    const t9pm = `${day}T21:00:00+01:00`;
    const t930pm = `${day}T21:30:00+01:00`;
    const t945pm = `${day}T21:45:00+01:00`;
    const t1030pm = `${day}T22:30:00+01:00`;

    // TODAY - Aug 21
    if(i === 0) {
      allMatches.push(
        { fixture: { id: 101, date: t8pm, status: {short: "NS"} }, teams: { home: {id:42,name:"Arsenal"}, away: {id:84,name:"Coventry City"}}, goals: {home: null, away: null}, league: {name: "Premier League"} },
        { fixture: { id: 201, date: t8pm, status: {short: "NS"} }, teams: { home: {id:543,name:"Real Betis"}, away: {id:548,name:"Real Sociedad"}}, goals: {home: null, away: null}, league: {name: "La Liga"} },
        { fixture: { id: 301, date: t945pm, status: {short: "NS"} }, teams: { home: {id:81,name:"Marseille"}, away: {id:82,name:"Strasbourg"}}, goals: {home: null, away: null}, league: {name: "Ligue 1"} },
        { fixture: { id: 401, date: t930pm, status: {short: "NS"} }, teams: { home: {id:501,name:"Erzurumspor"}, away: {id:490,name:"Galatasaray"}}, goals: {home: null, away: null}, league: {name: "Turkish Super Lig"} },
        { fixture: { id: 501, date: t9pm, status: {short: "NS"} }, teams: { home: {id:600,name:"Al Qadisiya"}, away: {id:601,name:"Al Ittihad"}}, goals: {home: null, away: null}, league: {name: "Saudi Pro League"} },
        { fixture: { id: 601, date: t8pm, status: {short: "NS"} }, teams: { home: {id:541,name:"Zamalek"}, away: {id:542,name:"Al Ittihad Alexandria"}}, goals: {home: null, away: null}, league: {name: "Egyptian League"} }
      );
    }

    // 1 DAY AGO - Aug 20
    if(i === -1) {
      allMatches.push(
        { fixture: { id: 111, date: t8pm, status: {short: "FT"} }, teams: { home: {id:50,name:"Man City"}, away: {id:47,name:"Tottenham"}}, goals: {home: 2, away: 1}, league: {name: "Premier League"} },
        { fixture: { id: 211, date: t9pm, status: {short: "FT"} }, teams: { home: {id:541,name:"Real Madrid"}, away: {id:530,name:"Atletico Madrid"}}, goals: {home: 3, away: 0}, league: {name: "La Liga"} }
      );
    }

    // 1 DAY AHEAD - Aug 22
    if(i === 1) {
      allMatches.push(
        { fixture: { id: 112, date: t730pm, status: {short: "NS"} }, teams: { home: {id:33,name:"Man United"}, away: {id:49,name:"Chelsea"}}, goals: {home: null, away: null}, league: {name: "Premier League"} },
        { fixture: { id: 212, date: t8pm, status: {short: "NS"} }, teams: { home: {id:529,name:"Barcelona"}, away: {id:549,name:"Valencia"}}, goals: {home: null, away: null}, league: {name: "La Liga"} }
      );
    }

    // 2 DAYS AHEAD - Aug 23
    if(i === 2) {
      allMatches.push(
        { fixture: { id: 113, date: t9pm, status: {short: "NS"} }, teams: { home: {id:40,name:"Liverpool"}, away: {id:46,name:"Newcastle"}}, goals: {home: null, away: null}, league: {name: "Premier League"} }
      );
    }

    // 3 DAYS BACK - Aug 18
    if(i === -3) {
      allMatches.push(
        { fixture: { id: 110, date: t8pm, status: {short: "FT"} }, teams: { home: {id:42,name:"Arsenal"}, away: {id:41,name:"Man City"}}, goals: {home: 1, away: 1}, league: {name: "Premier League"} }
      );
    }
  }
}
    
    res.json(allMatches);
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

 // MOCK LINEUP FOR TESTING
app.get("/api/lineup/:id", async (req, res) => {
  const fixtureId = parseInt(req.params.id);
  
  // Mock lineup for Arsenal vs Coventry id: 101
  if(fixtureId === 101) {
    return res.json([
      {
        team: {id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png"},
        coach: {id: 1, name: "Mikel Arteta"},
        formation: "4-3-3",
        startXI: [
          {player: {id: 1, name: "David Raya"}, number: 1, pos: "G"},
          {player: {id: 2, name: "Ben White"}, number: 4, pos: "D"},
          {player: {id: 3, name: "William Saliba"}, number: 2, pos: "D"},
          {player: {id: 4, name: "Gabriel"}, number: 6, pos: "D"},
          {player: {id: 5, name: "Oleksandr Zinchenko"}, number: 35, pos: "D"},
          {player: {id: 6, name: "Declan Rice"}, number: 41, pos: "M"},
          {player: {id: 7, name: "Martin Odegaard"}, number: 8, pos: "M"},
          {player: {id: 8, name: "Kai Havertz"}, number: 29, pos: "M"},
          {player: {id: 9, name: "Bukayo Saka"}, number: 7, pos: "F"},
          {player: {id: 10, name: "Gabriel Jesus"}, number: 9, pos: "F"},
          {player: {id: 11, name: "Gabriel Martinelli"}, number: 11, pos: "F"}
        ]
      },
      {
        team: {id: 84, name: "Coventry City", logo: "https://media.api-sports.io/football/teams/84.png"},
        coach: {id: 2, name: "Mark Robins"},
        formation: "4-2-3-1",
        startXI: [
          {player: {id: 12, name: "Brad Collins"}, number: 1, pos: "G"},
          {player: {id: 13, name: "Milan van Ewijk"}, number: 2, pos: "D"},
          {player: {id: 14, name: "Bobby Thomas"}, number: 5, pos: "D"},
          {player: {id: 15, name: "Luis Binks"}, number: 6, pos: "D"},
          {player: {id: 16, name: "Jake Bidwell"}, number: 3, pos: "D"},
          {player: {id: 17, name: "Ben Sheaf"}, number: 8, pos: "M"},
          {player: {id: 18, name: "Josh Eccles"}, number: 14, pos: "M"},
          {player: {id: 19, name: "Haji Wright"}, number: 11, pos: "F"},
          {player: {id: 20, name: "Tatsuhiro Sakamoto"}, number: 7, pos: "F"},
          {player: {id: 21, name: "Ellis Simms"}, number: 9, pos: "F"},
          {player: {id: 22, name: "Callum O'Hare"}, number: 10, pos: "F"}
        ]
      }
    ]);
  }
  
  // For other matches, return empty for now
  res.json([]);
});
*/

//iuytdsdfghoiuytrertyuiopoiuytrtyuiuyt

app.use(express.static("public"));



const MatchSchema = new mongoose.Schema({
  fixtureId: { type: Number, unique: true },
  date: Date, status: String, league: String,
  homeTeam: String, awayTeam: String,
  homeLogo: String, awayLogo: String,
  homeGoals: Number, awayGoals: Number,
  homeLineup: [String], 
  awayLineup: [String], 
  streamUrl: String,
  lastUpdated: Date
});
const Match = mongoose.model("Match", MatchSchema);

const API_KEY = "81431c2eedf64badbe12e5738921efa9"; 
const API_HEADERS = { "X-Auth-Token": API_KEY }

// FETCH PL 2025/2026
async function fetchAndSaveMatches(){
  console.log("Running Job: Fetching PL 2025/2026...");
  try{
    // FIX 1: Get next 50 matches + last 50 matches so upcoming is not empty
    const response = await axios.get("https://api.football-data.org/v4/competitions/PL/matches", {
      headers: API_HEADERS,
      params: { season: 2025, limit: 100 } // get more matches
    });

    const matches = response.data.matches;
    console.log(`Got ${matches.length} matches from API`);

    for(let m of matches){
      let homeLineup = [];
      let awayLineup = [];

      try{
        const lineupRes = await axios.get(`https://api.football-data.org/v4/matches/${m.id}`, {headers: API_HEADERS});
        homeLineup = lineupRes.data.homeTeam.lineup?.map(p => p.name) || [];
        awayLineup = lineupRes.data.awayTeam.lineup?.map(p => p.name) || [];
      }catch(e){}

      await Match.updateOne(
        { fixtureId: m.id },
        { $set: {
            fixtureId: m.id, 
            date: m.utcDate, 
            status: m.status,
            league: "Premier League", 
            homeTeam: m.homeTeam.name, 
            awayTeam: m.awayTeam.name,
            homeLogo: m.homeTeam.crest, 
            awayLogo: m.awayTeam.crest,
            homeGoals: m.score.fullTime.home, 
            awayGoals: m.score.fullTime.away, 
            homeLineup, awayLineup,
            streamUrl: `https://www.youtube.com/results?search_query=${m.homeTeam.name}+vs+${m.awayTeam.name}+full+match`,
            lastUpdated: new Date()
          }
        }, 
        { upsert: true }
      );
    }
    console.log(`✅ Saved ${matches.length} matches`);

  }catch(err){
    console.log("API Error:", err.response? err.response.data : err.message);
  }
}

cron.schedule("0 */6 * * *", fetchAndSaveMatches); // every 6 hours
fetchAndSaveMatches(); // run immediately on start

// API ROUTE - FIXED
app.get("/api/matches", async (req,res)=>{
  const {tab} = req.query;
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  let filter = { league: "Premier League" };
  if(tab === "today") filter.date = {$gte: today, $lt: tomorrow};
  if(tab === "upcoming") filter.status = "SCHEDULED"; // only scheduled matches
  if(tab === "finished") filter.status = "FINISHED";

  // FIX 2: Upcoming sorts ASC, others DESC
  const sortOrder = (tab === "upcoming")? {date: 1} : {date: -1}; 
  const matches = await Match.find(filter).sort(sortOrder).limit(50);
  res.json(matches);
});

app.get("*", (req,res)=>{
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


//end iuytuiopioiuytruiooiuyftyuioiuy
  

  app.listen(port, console.log('server is running on port 8000'))
  