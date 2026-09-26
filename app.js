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
const API_URL = "https://api.football-data.org/v4";
let isSyncing = false;

// ================= 3. DATABASE SCHEMA =================
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

// ================= 4. HELPER: GET DATE =================
function getDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

// ================= 5. HELPER: CALL API =================
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

// ================= 6. HELPER: CALCULATE LIVE MINUTE =================
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

// ================= 7. HELPER: FORMAT MATCH =================
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

// ================= 8. HELPER: GET SINGLE LIVE MATCH =================
async function getMatchWithMinute(id) {
  try {
    const data = await api(`/matches/${id}`);
    if (!data.match) return null;
    return format(data.match);
  } catch (error) {
    return null;
  }
}

// ================= 9. SYNC TO DATABASE (5 TIMES PER DAY) =================
async function fullSyncToDB(){
  if(isSyncing){
    console.log("[SKIP] Already syncing");
    return;
  }
  isSyncing = true;
  const nowWAT = new Date().toLocaleString("en-NG", {timeZone: "Africa/Lagos"});
  console.log(`[SYNC START] ${nowWAT} WAT - 5x per day mode`);
  try{
    const finishedData = await api("/matches", { dateFrom: getDate(-7), dateTo: getDate() });
    console.log(`[SYNC 1] Finished: ${finishedData.matches?.length || 0} matches`);
    await new Promise(r => setTimeout(r, 7000));
    const upcomingData = await api("/matches", { dateFrom: getDate(), dateTo: getDate(7) });
    console.log(`[SYNC 2] Upcoming: ${upcomingData.matches?.length || 0} matches`);
    const allMatches = [...(finishedData.matches || []),...(upcomingData.matches || [])];
    const uniqueMap = new Map();
    allMatches.forEach(m => uniqueMap.set(m.id, m));
    const uniqueList = Array.from(uniqueMap.values());
    const formatted = uniqueList.map(format);
    if(formatted.length > 0){
      const ops = formatted.map(m => ({
        updateOne: {
          filter: { _id: m._id },
          update: { $set: m },
          upsert: true
        }
      }));
      await Match.bulkWrite(ops, {ordered:false});
      console.log(`[SYNCED] ${formatted.length} matches saved to DB`);
    }
  }catch(e){
    console.log("[SYNC ERROR]", e.message);
  }finally{
    isSyncing = false;
  }
}

// ================= 10. GETMATCHES - FIXED TO NEVER CRASH =================
async function getMatches(type) {
  try {
    let filter = {};
    if (type === "today") {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
      filter = { date: { $gte: todayStart, $lte: todayEnd } };
    }
    if (type === "upcoming") {
      filter = {
        date: { $gte: new Date(getDate()), $lte: new Date(getDate(7)) },
        status: { $in: ["SCHEDULED","TIMED","IN_PLAY","PAUSED"] }
      };
    }
    if (type === "finished") {
      filter = {
        date: { $gte: new Date(getDate(-7)), $lte: new Date() },
        status: "FINISHED"
      };
    }
    let formatted = await Match.find(filter).lean();
    formatted.sort((a, b) => {
      const liveA = a.status === "IN_PLAY" || a.status === "PAUSED";
      const liveB = b.status === "IN_PLAY" || b.status === "PAUSED";
      if (liveA &&!liveB) return -1;
      if (!liveA && liveB) return 1;
      return new Date(a.date) - new Date(b.date);
    });
    return formatted;
  } catch(e) {
    console.log("getMatches error - fixed:", e.message);
    return []; // FIX: return empty instead of crashing
  }
}

// ================= 11. API ROUTE - FIXED 500 ERROR =================
app.get("/api/matches", async (req, res) => {
  try {
    const tab = req.query.tab || "today";
    const matches = await getMatches(tab);
    res.json({ success: true, matches });
  } catch (error) {
    console.log("API error fixed:", error.message);
    res.json({ success: true, matches: [] }); // FIXED: Was res.status(500) - now never 500
  }
});

// ================= 12. CRON: 5 TIMES PER DAY =================
const syncTimesUTC = [
  "10 22 * * *",
  "0 3 * * *",
  "26 10 * * *",
  "14 15 * * *",
  "2 20 * * *",
];
syncTimesUTC.forEach(time => {
  cron.schedule(time, async () => {
    const nowWAT = new Date().toLocaleString("en-NG", {timeZone: "Africa/Lagos"});
    console.log(`[CRON 5x] Running sync at ${nowWAT} WAT`);
    try{ await fullSyncToDB(); }catch(e){ console.log("cron fail", e.message); }
  }, { timezone: "UTC" });
});

setTimeout(async () => {
  console.log("🚀 Initial sync starting...");
  try{ await fullSyncToDB(); }catch(e){}
}, 5000);


// country match ihgfchjjhgviiuyuiodiuuojihuuiub



const API = 'e11e83e05b19af09fbdd776affffc3a7';


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

const CountryMatch = mongoose.model(
  'CountryMatch',
  countrySchema
);


// ===============================
// COUNTRY COMPETITION CHECK
// ===============================

function isCountryMatch(m) {

  const league = (m.league?.name || '').toLowerCase();

  const countryCompetitions = [

    // World
    'world cup',
    'world cup qualification',
    'world cup qualifiers',

    // Europe
    'euro',
    'european championship',
    'european championship qualification',
    'euro qualification',
    'nations league',

    // Africa
    'africa cup of nations',
    'afcon',
    'africa cup',
    'african nations',
    'world cup - qualification africa',

    // Asia
    'asian cup',
    'afc asian cup',
    'world cup - qualification asia',

    // South America
    'copa america',
    'world cup - qualification south america',

    // North/Central America
    'concacaf',
    'gold cup',
    'concacaf nations league',
    'world cup - qualification concacaf',

    // Oceania
    'oceania nations cup',
    'ofc nations cup',
    'world cup - qualification oceania',

    // International
    'friendlies',
    'international friendly',
    'international friendlies'
  ];

  return countryCompetitions.some(name =>
    league.includes(name)
  );
}


// ===============================
// FETCH 7 DAYS BACK + TODAY
// + 7 DAYS FRONT
// ===============================

async function fetchCountryMatches() {

  try {

    console.log(
      `[FETCH START] ${new Date().toLocaleString()} - COUNTRY ONLY`
    );

    let allCountryMatches = [];

    const today = new Date();

    today.setUTCHours(0, 0, 0, 0);


    // -7 through +7 = 15 days
    for (let i = -7; i <= 7; i++) {

      const date = new Date(today);

      date.setUTCDate(
        date.getUTCDate() + i
      );

      const dateStr =
        date.toISOString().split('T')[0];


      try {

        const response = await axios.get(
          `https://v3.football.api-sports.io/fixtures?date=${dateStr}`,
          {
            headers: {
              'x-apisports-key': API
            }
          }
        );


        const fixtures =
          response.data.response || [];


        // COUNTRY / NATIONAL COMPETITIONS ONLY
        const countryMatches =
          fixtures.filter(isCountryMatch);


        console.log(
          `[FETCH] ${dateStr} -> Total: ${fixtures.length} | Country: ${countryMatches.length}`
        );


        countryMatches.forEach(m => {

          console.log(
            `  >> COUNTRY: ${m.teams.home.name} vs ${m.teams.away.name} | ` +
            `${m.league.name} | ` +
            `${m.fixture.status.short} ` +
            `${m.goals.home ?? 0}-${m.goals.away ?? 0}`
          );

        });


        allCountryMatches.push(
          ...countryMatches
        );


        // Delay
        await new Promise(
          resolve => setTimeout(resolve, 1100)
        );


      } catch (dayErr) {

        console.log(
          `Error ${dateStr}:`,
          dayErr.response?.data?.errors ||
          dayErr.message
        );

      }

    }


    // ===============================
    // SAVE TO MONGODB
    // ===============================

    for (const m of allCountryMatches) {

      const data = {

        fixture_id: m.fixture.id,

        home_team:
          m.teams.home.name,

        away_team:
          m.teams.away.name,

        home_logo:
          m.teams.home.logo,

        away_logo:
          m.teams.away.logo,

        league:
          m.league.name,

        league_logo:
          m.league.logo,

        match_date:
          new Date(m.fixture.date),

        status:
          m.fixture.status.short,

        elapsed:
          m.fixture.status.elapsed,

        score_home:
          m.goals.home,

        score_away:
          m.goals.away,

        last_updated:
          new Date()
      };


      await CountryMatch.findOneAndUpdate(

        {
          fixture_id:
            data.fixture_id
        },

        data,

        {
          upsert: true,
          new: true
        }

      );

    }


    // ===============================
    // DELETE OLD MATCHES
    // ===============================

    const start = new Date(today);

    start.setUTCDate(
      start.getUTCDate() - 7
    );


    const end = new Date(today);

    end.setUTCHours(
      23, 59, 59, 999
    );

    end.setUTCDate(
      end.getUTCDate() + 7
    );


    const deleted =
      await CountryMatch.deleteMany({

        $or: [

          {
            match_date: {
              $lt: start
            }
          },

          {
            match_date: {
              $gt: end
            }
          }

        ]

      });


    console.log(
      `[DB CLEANUP] Deleted ${deleted.deletedCount} old/outside matches`
    );


    console.log(
      `[TOTAL] Found ${allCountryMatches.length} COUNTRY matches`
    );

    console.log(
      `[DB] Country matches saved`
    );


  } catch (err) {

    console.log(
      '[API ERROR]:',
      err.message
    );

  }

}


// ===============================
// CRON
// ===============================

cron.schedule(
  '0 0 * * *',
  async () => {
    console.log('[CRON] 00:00');
    await fetchCountryMatches();
  }
);

cron.schedule(
  '0 3 * * *',
  async () => {
    console.log('[CRON] 03:00');
    await fetchCountryMatches();
  }
);

cron.schedule(
  '0 6 * * *',
  async () => {
    console.log('[CRON] 06:00');
    await fetchCountryMatches();
  }
);

cron.schedule(
  '0 9 * * *',
  async () => {
    console.log('[CRON] 09:00');
    await fetchCountryMatches();
  }
);

cron.schedule(
  '0 12 * * *',
  async () => {
    console.log('[CRON] 12:00');
    await fetchCountryMatches();
  }
);

cron.schedule(
  '0 16 * * *',
  async () => {
    console.log('[CRON] 16:00');
    await fetchCountryMatches();
  }
);

cron.schedule(
  '0 20 * * *',
  async () => {
    console.log('[CRON] 20:00');
    await fetchCountryMatches();
  }
);

cron.schedule(
  '10 23 * * *',
  async () => {
    console.log('[CRON] 23:10');
    await fetchCountryMatches();
  }
);


// ===============================
// INITIAL SYNC
// ===============================

(async () => {

  console.log(
    'Initial sync - 7 DAYS BACK + TODAY + 7 DAYS FRONT'
  );

  await fetchCountryMatches();

})();


// ===============================
// GET COUNTRY MATCHES
// ===============================

app.get(
  '/api/country-matches',
  async (req, res) => {

    try {

      const today = new Date();

      today.setUTCHours(
        0, 0, 0, 0
      );


      const start =
        new Date(today);

      start.setUTCDate(
        start.getUTCDate() - 7
      );


      const end =
        new Date(today);

      end.setUTCHours(
        23, 59, 59, 999
      );

      end.setUTCDate(
        end.getUTCDate() + 7
      );


      const matches =
        await CountryMatch.find({

          match_date: {
            $gte: start,
            $lte: end
          }

        }).sort({

          match_date: 1

        });


      res.json(matches);


    } catch (err) {

      res.status(500).json({
        error: err.message
      });

    }

  }
);


// ===============================
// MANUAL FETCH
// ===============================

app.get(
  '/api/fetch-now',
  async (req, res) => {

    try {

      await fetchCountryMatches();

      res.json({

        message:
          'Country fetch done',

        window:
          '7 days back + today + 7 days front'

      });

    } catch (err) {

      res.status(500).json({
        error: err.message
      });

    }

  }
);


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
  