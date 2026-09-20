

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
 
//cd4f805839fe4cdcac3de651ec2b4c68


// CONFIG
const API_KEY = "cd4f805839fe4cdcac3de651ec2b4c68";
const API_URL = "https://api.football-data.org/v4";


// Schema
const MatchSchema = new mongoose.Schema({
  _id: String,
  date: Date,
  status: String,
  minute: Number,
  league: String,
  home: {
    name: String,
    logo: String
  },
  away: {
    name: String,
    logo: String
  },
  homeScore: Number,
  awayScore: Number
}, {
  collection: "matches"
});

const Match = mongoose.model("Matchnew", MatchSchema);

// Helper to get date string YYYY-MM-DD with offset
function getDate(offset) {
  const d = new Date();
  d.setDate(d.getDate() + (offset || 0));
  return d.toISOString().split("T")[0];
}

// Call football-data.org API
async function callAPI(endpoint, params) {
  params = params || {};
  const url = new URL(API_URL + endpoint);

  for (let k in params) {
    url.searchParams.set(k, params[k]);
  }

  const res = await fetch(url, {
    headers: {
      "X-Auth-Token": API_KEY
    }
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Rate limit hit - football-data.org blocked you");
    }
    throw new Error(data.message || "API Error " + res.status);
  }

  return data;
}

// Format API response to our DB format
function formatMatch(m) {
  let homeScore = 0;
  let awayScore = 0;

  if (m.score && m.score.fullTime) {
    homeScore = m.score.fullTime.home!= null? m.score.fullTime.home : 0;
    awayScore = m.score.fullTime.away!= null? m.score.fullTime.away : 0;
  }

  return {
    _id: String(m.id),
    date: new Date(m.utcDate),
    status: m.status,
    minute: m.minute || null,
    league: m.competition? m.competition.name : "Football",
    home: {
      name: m.homeTeam? m.homeTeam.name : "Home",
      logo: m.homeTeam && m.homeTeam.id? "https://crests.football-data.org/" + m.homeTeam.id + ".png" : ""
    },
    away: {
      name: m.awayTeam? m.awayTeam.name : "Away",
      logo: m.awayTeam && m.awayTeam.id? "https://crests.football-data.org/" + m.awayTeam.id + ".png" : ""
    },
    homeScore: homeScore,
    awayScore: awayScore
  };
}

// ROUTE 1: SYNC - Fetch 7 days back to 7 days front and SAVE to backend
app.get("/api/sync", async (req, res) => {
  try {
    await connectDB();

    const from = getDate(-7);
    const to = getDate(7);

    console.log("Syncing from " + from + " to " + to);

    const data = await callAPI("/matches", {
      dateFrom: from,
      dateTo: to
    });

    const list = data.matches || [];

    if (list.length === 0) {
      return res.json({
        success: true,
        synced: 0,
        message: "No matches from API"
      });
    }

    const formatted = list.map(formatMatch);

    const operations = formatted.map(m => {
      return {
        updateOne: {
          filter: { _id: m._id },
          update: { $set: m },
          upsert: true
        }
      };
    });

    await Match.bulkWrite(operations);

    res.json({
      success: true,
      synced: formatted.length,
      dateFrom: from,
      dateTo: to
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ROUTE 2: MATCHES - Frontend calls this, reads from backend only
app.get("/api/matches", async (req, res) => {
  try {
    await connectDB();

    const tab = req.query.tab || "upcoming";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);

    const ago7Days = new Date(today);
    ago7Days.setDate(today.getDate() - 7);

    let filter = {};

    if (tab === "upcoming") {
      filter = {
        date: {
          $gte: today,
          $lte: in7Days
        }
      };
    }

    if (tab === "finished") {
      filter = {
        date: {
          $gte: ago7Days,
          $lt: tomorrow
        }
      };
    }

    const matches = await Match.find(filter).sort({ date: 1 });

    res.json({
      success: true,
      matches: matches
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.listen(port, console.log('server is running on port 8000'))

/*

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Live Football</title>
<style>
    * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: system-ui;
  }
  body {
    background: #000;
    color: #fff;
    padding: 12px;
  }
  h1 {
    text-align: center;
    font-size: 26px;
    margin: 10px 0 5px;
  }
 .sub {
    text-align: center;
    color: #ddd;
    font-size: 14px;
    line-height: 1.3;
    margin-bottom: 15px;
  }
 .tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
  }
 .tabs button {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: 12px;
    font-weight: bold;
    font-size: 16px;
    cursor: pointer;
  }
 .tab-up {
    background: #1db954;
    color: #fff;
  }
 .tab-fin {
    background: #4a1a1a;
    color: #8a5a5a;
  }
 .tabs button.active-up {
    background: #16a34a;
    color: #fff;
  }
 .tabs button.active-fin {
    background: #7f1d1d;
    color: #fff;
  }
 .date-head {
    color: #3b82f6;
    font-weight: 600;
    margin: 20px 0 10px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
  }
 .card {
    background: #121212;
    border-radius: 16px;
    padding: 14px;
    margin-bottom: 14px;
    border: 1px solid #222;
  }
 .league {
    color: #d18c2a;
    font-weight: 600;
    font-size: 14px;
  }
 .time {
    color: #777;
    font-size: 12px;
    margin: 3px 0 12px;
  }
 .match-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
 .team {
    width: 32%;
    text-align: center;
    font-size: 13px;
    font-weight: 500;
  }
 .team img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    display: block;
    margin: 0 auto 8px;
  }
 .score-box {
    text-align: center;
  }
 .score {
    font-size: 28px;
    font-weight: bold;
    letter-spacing: 1px;
  }
 .live-badge {
    background: #2b6de8;
    color: #fff;
    border-radius: 8px;
    padding: 5px 10px;
    font-size: 12px;
    font-weight: bold;
    display: inline-block;
    margin-top: 6px;
    line-height: 1.2;
  }
 .glitch {
    text-align: center;
    font-size: 11px;
    color: #ccc;
    margin: 12px 0 10px;
  }
 .btn-lineup {
    width: 100%;
    background: #1a2332;
    color: #fff;
    border: none;
    padding: 12px;
    border-radius: 12px;
    margin-bottom: 8px;
    font-weight: 500;
    cursor: pointer;
  }
 .btn-watch {
    width: 100%;
    background: #c1272d;
    color: #fff;
    border: none;
    padding: 12px;
    border-radius: 12px;
    font-weight: 600;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
</style>
</head>
<body>

<h1>Live Football ⚽</h1>
<p class="sub">Finish Match Will Show In Finished Tab<br>within Some Hours</p>

<div class="tabs">
  <button id="btn-upcoming" class="tab-up active-up" onclick="loadMatches('upcoming')">Upcoming</button>
  <button id="btn-finished" class="tab-fin" onclick="loadMatches('finished')">Finished</button>
</div>

<div id="matches"></div>

<script>
const API = "http://localhost:800/api/matches";
const box = document.getElementById("matches");

let cache = {
  upcoming: JSON.parse(localStorage.getItem('cache_upcoming') || '[]'),
  finished: JSON.parse(localStorage.getItem('cache_finished') || '[]')
};

function formatDateHeader(dateStr){
  const d = new Date(dateStr);
  return `📅 ${d.toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}`;
}

function formatFullDate(dateStr){
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}) + " · " + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}

function getStatusBadge(match){
  if(match.status === "IN_PLAY"){
    let minute = match.minute || 83;
    if(minute === 45){
      return `<div class="live-badge">HALF<br>TIME</div>`;
    }
    return `<div class="live-badge">LIVE<br>${minute}'</div>`;
  }

  if(match.status === "PAUSED"){
    return `<div class="live-badge">HALF<br>TIME</div>`;
  }

  if(match.status === "FINISHED"){
    return `<div style="color:#777;font-size:12px;margin-top:6px">FINISH</div>`;
  }

  return `<div style="color:#777;font-size:12px;margin-top:6px">${new Date(match.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>`;
}

function cleanLeagueName(name){
  if(!name) return name;
  if(name.toLowerCase().includes("primera division")){
    return "LaLiga EA";
  }
  return name;
}

function renderMatch(match){
  const youtubeLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(match.home.name + " vs " + match.away.name + " live")}`;

  return `
  <div class="card">
    <div class="league">${cleanLeagueName(match.league)}</div>
    <div class="time">${formatFullDate(match.date)}</div>

    <div class="match-row">
      <div class="team">
        <img src="${match.home.logo}" onerror="this.src='https://via.placeholder.com/48'">
        <div>${match.home.name}</div>
      </div>

      <div class="score-box">
        <div class="score">${match.homeScore} - ${match.awayScore}</div>
        ${getStatusBadge(match)}
      </div>

      <div class="team">
        <img src="${match.away.logo}" onerror="this.src='https://via.placeholder.com/48'">
        <div>${match.away.name}</div>
      </div>
    </div>

    <div class="glitch">Extra time might show as 90 that is a glitch from api</div>

    <button class="btn-lineup" onclick="alert('Line Up Coming Soon')">Line Up</button>
    <button class="btn-watch" onclick="window.open('${youtubeLink}', '_blank')">▶ Watch Live</button>
  </div>
  `;
}

function groupByDate(matches){
  const groups = {};
  matches.forEach(match => {
    const d = new Date(match.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if(!groups[key]){
      groups[key] = [];
    }
    groups[key].push(match);
  });
  return groups;
}

function renderGrouped(matches, tab){
  if(!matches || matches.length === 0){
    box.innerHTML = `<p style="text-align:center;color:#777;margin-top:20px">No ${tab} matches</p>`;
    return;
  }

  const grouped = groupByDate(matches);

  let dates = Object.keys(grouped).sort((a,b) => {
    return new Date(grouped[a][0].date) - new Date(grouped[b][0].date);
  });

  if(tab === 'finished'){
    dates = dates.reverse();
  }

  let html = "";
  dates.forEach(key => {
    html += `<div class="date-head">${formatDateHeader(grouped[key][0].date)}</div>`;
    grouped[key].forEach(match => {
      html += renderMatch(match);
    });
  });

  box.innerHTML = html;
}

async function loadMatches(tab){
  document.getElementById("btn-upcoming").className = tab === "upcoming"? "tab-up active-up" : "tab-up";
  document.getElementById("btn-finished").className = tab === "finished"? "tab-fin active-fin" : "tab-fin";

  if(cache[tab] && cache[tab].length > 0){
    renderGrouped(cache[tab], tab);
  } else {
    box.innerHTML = "<p style='text-align:center;color:#777;margin-top:20px'>Loading...</p>";
  }

  try{
    const res = await fetch(`${API}?tab=${tab}`, { cache: "no-store" });
    const data = await res.json();
    const list = data.matches || [];

    if(list.length > 0){
      cache[tab] = list;
      localStorage.setItem('cache_' + tab, JSON.stringify(list));
      renderGrouped(list, tab);
    }
  }catch(err){
    console.log("Fetch error", err);
  }
}

loadMatches("upcoming");
</script>

</body>
</html>
</head>

*/


