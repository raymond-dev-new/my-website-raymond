  
   import express from 'express'
   import dotenv from 'dotenv'
   dotenv.config()
   import { fileURLToPath } from 'url'
   import mongoose from 'mongoose'
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
   import fetch from "node-fetch";
   import http from 'http'
   import { Server } from 'socket.io'
   import { exec } from 'child_process'
   import util from 'util'
   
   const app = express()
   const port = process.env.PORT || 8000
   const JWT_SECRET = process.env.JWT_SECRET
   const JWT_SECRETT = 'jhgfdghjkhytredfgjhkjhgjfhdgsHJJHDKJHRHJERKJhkgjhjfhdgsHJJHDKJHRHJERKJhkgjhjbknhghfdgjhkjkh'
   const url = process.env.MONGO_URL
   
   //app.use(cors({ origin: "*" }));
   app.use(cors({ origin: true, credentials: true }));
   app.options('*', cors());
   app.use(bordyparser.json());
   app.use(express.json({ limit: '200mb' }));
   app.use(express.static(path.join(__dirname, 'frontend')))
   app.use((req, res, next) => { console.log(` ${req.method} ${req.url}`); next(); })
   
   mongoose.connect(url).then(() => console.log("MongoDB Connected")).catch(err => console.log(err));
   app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'frontend', 'sbd.html')); })


const SECRET = process.env.SECRET || 'my-secret-key-123';

// ===== USER TABLE - NO displayName, WITH email =====
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: "" },
  link: { type: String, default: "" },
  avatar: { type: String, default: "" },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  passwordResetCode: { type: String, default: "" },
  passwordResetExpires: { type: Date, default: null },
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

// ===== NOVEL TABLE - ALL IN DB =====
const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  cover: { type: String, default: "" },
  fileData: { type: String, default: "" },
  fileName: { type: String, default: "" },
  fileType: { type: String, default: "" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', postSchema);

// ===== PRIVATE MESSAGE TABLE =====
const messageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// ===== LOGIN CHECK =====
function authh(req, res, next){
  const token = req.headers.authorization;
  if(!token) return res.status(401).json({msg:'No token'});
  try{ 
    req.user = { 
      id: jwt.verify(token, SECRET).id 
    }; 
    next(); 
  }
  catch(e){ return res.status(401).json({msg:'Invalid token'}); }
}

// ===== UPLOADD - MEMORY ONLY, NO FOLDER =====
// Renamed to uploadd with 2 d
const uploadd = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }
});

// Helper: turn file buffer to base64 text for DB
function toBase64(file){
  if(!file) return "";
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

// =================================================
// ===== USERS - WITH EMAIL =====
// =================================================

app.post('/api/users/register', async (req,res)=>{
  try{
    const { username, email, password } = req.body;
    if(!username || !email || !password) return res.status(400).json({msg:'Fill username, email and password'});
    if(await User.findOne({username})) return res.status(400).json({msg:'Username taken'});
    if(await User.findOne({email})) return res.status(400).json({msg:'Email already used'});
    const hash = await bcrypt.hash(password,10);
    const user = new User({ username, email: email.toLowerCase().trim(), password: hash });
    await user.save();
    const token = jwt.sign({id:user._id}, SECRET);
    res.json({ token, user:{ _id:user._id, username:user.username, email:user.email } });
  }catch(e){ res.status(500).json({msg:'Server error'}); }
});

app.post('/api/users/login', async (req,res)=>{
  try{
    const { email, username, password } = req.body;
    const findBy = email ? { email: email.toLowerCase().trim() } : { username };
    const user = await User.findOne(findBy);
    if(!user) return res.status(400).json({msg:'User not found'});
    if(!await bcrypt.compare(password, user.password)) return res.status(400).json({msg:'Wrong password'});
    const token = jwt.sign({id:user._id}, SECRET);
    res.json({ token, user:{ _id:user._id, username:user.username, email:user.email } });
  }catch(e){ res.status(500).json({msg:'Server error', }); }
});

//res.status(500).json({msg:'Server error', });
// FIND USER BY EMAIL - exact - MUST be before /:id
app.get('/api/users/search', authh, async (req,res)=>{
  const email = (req.query.email || '').toLowerCase().trim();
  if(!email) return res.status(400).json({msg:'Add ?email='});
  const user = await User.findOne({ email }).select('-password').populate('followers','username email avatar').populate('following','username email avatar');
  if(!user) return res.status(404).json({msg:'No user with this email'});
  res.json({ user });
});

// FIND USERS BY EMAIL - partial - MUST be before /:id
// CHANGED: Endpoint now searches by NAME / USERNAME, not by EMAIL
// OLD: app.get('/api/users/find', authh, async (req,res)=>{ const q = req.query.email ... User.find({ email: ... }) })
// NEW: uses req.query.name and searches username + name fields

app.get('/api/users/find', authh, async (req,res)=>{
  // CHANGED: Read ?name= instead of ?email=
  const q = (req.query.name || '').trim();
  if(!q) return res.json([]);

  // CHANGED: Search in username AND name fields, not email
  // $or = match if name appears in username OR in name
  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { name: { $regex: q, $options: 'i' } }
    ]
  }).select('-password -email').limit(20); // CHANGED: Also hide email from result

  res.json(users);
});

// GET ALL USERS - MUST be before /:id
app.get('/api/users/all', authh, async (req,res)=>{
  const users = await User.find({ _id: { $ne: req.user.id } }).select('-password').sort({username:1});
  res.json(users);
});

// MY PROFILE - MUST be before /:id
app.get('/api/users/me/profile', authh, async (req,res)=>{
  const user = await User.findById(req.user.id).select('-password').populate('followers','username email avatar').populate('following','username email avatar');
  if(!user) return res.status(404).json({msg:'Not found'});
  const posts = await Post.find({user:req.user.id}).populate('user','username email avatar').sort({createdAt:-1});
  res.json({ user, posts, followersCount:user.followers.length, followingCount:user.following.length });
});

// OTHER USER PROFILE - MUST be before /:id
app.get('/api/users/:id/profile', authh, async (req,res)=>{
  const user = await User.findById(req.params.id).select('-password').populate('followers','username email avatar').populate('following','username email avatar');
  if(!user) return res.status(404).json({msg:'Not found'});
  const posts = await Post.find({user:req.params.id}).populate('user','username email avatar').sort({createdAt:-1});
  res.json({ user, posts, followersCount:user.followers.length, followingCount:user.following.length });
});

// GET ONE USER BY ID
app.get('/api/users/:id', authh, async (req,res)=>{
  if(req.params.id==='me'){
    const me = await User.findById(req.user.id).select('-password').populate('followers','username email avatar').populate('following','username email avatar');
    return res.json({ user: me });
  }
  const user = await User.findById(req.params.id).select('-password').populate('followers','username email avatar').populate('following','username email avatar');
  if(!user) return res.status(404).json({msg:'Not found'});
  res.json({ user });
});

// UPDATE - NO displayName
app.put('/api/users/me', authh, async (req,res)=>{
  const { username, email, bio, link } = req.body;
  const update = {};
  if(username) update.username = username;
  if(email) update.email = email.toLowerCase().trim();
  if(bio !== undefined) update.bio = bio;
  if(link !== undefined) update.link = link;
  const user = await User.findByIdAndUpdate(req.user.id, update, {new:true}).select('-password');
  res.json({ user });
});
app.put('/api/users/update', authh, async (req,res)=>{
  const { username, email, bio, link } = req.body;
  const update = {};
  if(username) update.username = username;
  if(email) update.email = email.toLowerCase().trim();
  if(bio !== undefined) update.bio = bio;
  if(link !== undefined) update.link = link;
  const user = await User.findByIdAndUpdate(req.user.id, update, {new:true}).select('-password');
  res.json({ user });
});

// AVATAR - Saved in DB as base64, uses uploadd
app.post('/api/users/avatar', authh, uploadd.single('file'), async (req,res)=>{
  if(!req.file) return res.status(400).json({msg:'No file'});
  const avatar = toBase64(req.file);
  await User.findByIdAndUpdate(req.user.id, { avatar });
  res.json({ avatar });
});
app.post('/api/users/me/avatar', authh, uploadd.single('file'), async (req,res)=>{
  if(!req.file) return res.status(400).json({msg:'No file'});
  const avatar = toBase64(req.file);
  await User.findByIdAndUpdate(req.user.id, { avatar });
  res.json({ avatar });
});
app.put('/api/users/avatar', authh, uploadd.single('file'), async (req,res)=>{
  if(!req.file) return res.status(400).json({msg:'No file'});
  const avatar = toBase64(req.file);
  await User.findByIdAndUpdate(req.user.id, { avatar });
  res.json({ avatar });
});
app.delete('/api/users/avatar', authh, async (req,res)=>{
  await User.findByIdAndUpdate(req.user.id, { avatar: "" });
  res.json({ ok:true });
});

// FOLLOW / UNFOLLOW
app.post('/api/users/:id/follow', authh, async (req,res)=>{
  const targetId = req.params.id; const myId = req.user.id;
  if(targetId===myId) return res.status(400).json({msg:'Cannot follow yourself'});
  const target = await User.findById(targetId);
  const me = await User.findById(myId);
  if(!target || !me) return res.status(404).json({msg:'User not found'});
  if(target.followers.includes(myId)){
    target.followers = target.followers.filter(id=> id.toString()!==myId);
    me.following = me.following.filter(id=> id.toString()!==targetId);
  } else {
    target.followers.push(myId);
    me.following.push(targetId);
  }
  await target.save(); await me.save();
  res.json({ ok:true });
});

// =================================================
// ===== NOVELS - ALL IN DATABASE =====
// =================================================

// CREATE NOVEL - uses uploadd
app.post('/api/posts', authh, uploadd.fields([{name:'file', maxCount:1}, {name:'cover', maxCount:1}]), async (req,res)=>{
  try{
    const title = req.body.title || req.body.caption;
    const content = req.body.content || req.body.text || "";
    if(!title) return res.status(400).json({msg:'Title needed'});
    let cover = req.body.cover || "";
    let fileData = req.body.fileData || "";
    let fileName = "";
    let fileType = "";
    if(req.files && req.files.file && req.files.file[0]){
      const f = req.files.file[0];
      if(f.mimetype.startsWith('image/')) cover = toBase64(f);
      else { fileData = toBase64(f); fileName = f.originalname; fileType = f.mimetype; }
    }
    if(req.files && req.files.cover && req.files.cover[0]) cover = toBase64(req.files.cover[0]);
    const post = new Post({ title, content, cover, fileData, fileName, fileType, user: req.user.id });
    await post.save(); res.json(post);
  }catch(e){ res.status(500).json({msg:'Server error'}); }
});

app.post('/api/posts/create', authh, uploadd.fields([{name:'file', maxCount:1}, {name:'cover', maxCount:1}]), async (req,res)=>{
  try{
    const title = req.body.title || req.body.caption;
    const content = req.body.content || req.body.text || "";
    let cover = req.body.cover || "";
    let fileData = req.body.fileData || "";
    let fileName = ""; let fileType = "";
    if(req.files && req.files.file && req.files.file[0]){
      const f = req.files.file[0];
      if(f.mimetype.startsWith('image/')) cover = toBase64(f);
      else { fileData = toBase64(f); fileName = f.originalname; fileType = f.mimetype; }
    }
    if(req.files && req.files.cover && req.files.cover[0]) cover = toBase64(req.files.cover[0]);
    const post = new Post({ title, content, cover, fileData, fileName, fileType, user: req.user.id });
    await post.save(); res.json(post);
  }catch(e){ res.status(500).json({msg:'Server error'}); }
});

// FEED - MUST be before /:id
app.get('/api/posts/feed', async (req,res)=>{
  const page = parseInt(req.query.page||1);
  const limit = parseInt(req.query.limit||8);
  const posts = await Post.find().populate('user','username email avatar').populate('comments.user','username email').sort({createdAt:-1}).skip((page-1)*limit).limit(limit);
  res.json(posts);
});

// ADDED ONLY - Delete post - only owner can delete, must be logged in
app.delete('/api/posts/:id', authh, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if(!post) return res.status(404).json({msg:'Post not found'});
  // Only the owner can delete
  if(post.user.toString() !== req.user.id) return res.status(403).json({msg:'You can only delete your own post'});
  await post.deleteOne();
  res.json({msg:'Deleted'});
});

// MY SAVED - MUST be before /:id
app.get('/api/posts/saved/mine', authh, async (req,res)=>{
  const posts = await Post.find({ savedBy: req.user.id }).populate('user','username email avatar').populate('comments.user','username email').sort({createdAt:-1});
  res.json(posts);
});

// ALL NOVELS
app.get('/api/posts', authh, async (req,res)=>{
  const posts = await Post.find().populate('user','username email avatar').populate('comments.user','username email').sort({createdAt:-1});
  res.json(posts);
});

// ONE NOVEL
app.get('/api/posts/:id', async (req,res)=>{
  const p = await Post.findById(req.params.id).populate('user','username email avatar').populate('comments.user','username email');
  if(!p) return res.status(404).json({msg:'Not found'});
  res.json(p);
});

// LIKE
app.post('/api/posts/:id/like', authh, async (req,res)=>{
  const p = await Post.findById(req.params.id);
  if(!p) return res.status(404).json({msg:'Not found'});
  const uid = req.user.id;
  if(p.likes.includes(uid)) p.likes = p.likes.filter(id=> id.toString()!==uid);
  else p.likes.push(uid);
  await p.save(); res.json(p);
});

// COMMENT
app.post('/api/posts/:id/comment', authh, async (req,res)=>{
  const p = await Post.findById(req.params.id);
  if(!p) return res.status(404).json({msg:'Not found'});
  p.comments.push({ user: req.user.id, text: req.body.text });
  await p.save(); res.json(p);
});

// SAVE / UNSAVE
app.post('/api/posts/:id/save', authh, async (req,res)=>{
  const p = await Post.findById(req.params.id);
  if(!p) return res.status(404).json({msg:'Not found'});
  const uid = req.user.id;
  if(p.savedBy.includes(uid)) p.savedBy = p.savedBy.filter(id=> id.toString()!==uid);
  else p.savedBy.push(uid);
  await p.save(); res.json({ saved: p.savedBy.includes(uid) });
});

// DELETE NOVEL
app.delete('/api/posts/:id', authh, async (req,res)=>{
  await Post.findByIdAndDelete(req.params.id);
  res.json({ ok:true });
});

// =================================================
// ===== PRIVATE MESSAGES =====
// =================================================

// UNREAD COUNT - MUST be before /:otherId
app.get('/api/messages/unread/counts', authh, async (req,res)=>{ res.json({}); });

// GET CHAT
app.get('/api/messages/:otherId', authh, async (req,res)=>{
  const me = req.user.id; const other = req.params.otherId;
  const msgs = await Message.find({ $or:[ {from:me,to:other}, {from:other,to:me} ] }).populate('from','username email').sort({createdAt:1});
  res.json(msgs);
});

// SEND MESSAGE
app.post('/api/messages/:otherId', authh, async (req,res)=>{
  const msg = new Message({ from: req.user.id, to: req.params.otherId, text: req.body.text });
  await msg.save(); res.json(msg);
});

// ============================================
// DELETE ONE MESSAGE - From Database
// DELETE /api/messages/:id
// Only the sender can delete their own message
// ============================================
app.delete('/api/messages/:id', authh, async (req, res) => {
  try {
    const messageId = req.params.id;
    const myId = req.user.id; // your auth middleware sets req.user

    // 1. Find the message in database
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // 2. Only the person who sent it can delete it
    // message.from is the sender id
    if (message.from.toString() !== myId.toString()) {
      return res.status(403).json({ error: 'You can only delete your own message' });
    }

    // 3. Delete that ONE message from database
    await Message.findByIdAndDelete(messageId);

    // 4. Success - frontend will already have removed it from screen
    res.json({ success: true, message: 'Message deleted' });

  } catch (err) {
    console.log('Delete message error:', err);
    res.status(500).json({ error: 'Could not delete message' });
  }
});


// ============================================================
// GROUP ONLY - ADDED BELOW - DOES NOT TOUCH Message ABOVE
// ============================================================
const ADMIN_EMAIL = "letswintrade@gmail.com";

// Group uses SAME shape as your Message, but no 'to' - because it's for ALL users
const groupMessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // no 'to' - every user on website is in group
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const GroupMessage = mongoose.models.GroupMessage || mongoose.model('GroupMessage', groupMessageSchema);

// Helper: check if logged-in user is admin
async function isGroupAdmin(req) {
  const user = await User.findById(req.user.id);
  if (!user) return null;
  if (String(user.email).toLowerCase() !== ADMIN_EMAIL) return null;
  return user;
}

// 1. GET GROUP MESSAGES - All users can READ (all users are in group automatically)
app.get('/api/group-messages', authh, async (req, res) => {
  try {
    const msgs = await GroupMessage.find().populate('from', 'username avatar email').sort({ createdAt: 1 }).limit(200);
    res.json(msgs);
  } catch (e) { res.status(500).json({ error: 'Could not load group' }); }
});

// 2. SEND GROUP MESSAGE - ONLY ADMIN
app.post('/api/group-messages', authh, async (req, res) => {
  try {
    const admin = await isGroupAdmin(req);
    if (!admin) return res.status(403).json({ error: 'Only admin can send in group' });
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Empty message' });
    const msg = await GroupMessage.create({ from: admin._id, text: text.trim() });
    const full = await GroupMessage.findById(msg._id).populate('from', 'username avatar email');
    res.json(full);
  } catch (e) { res.status(500).json({ error: 'Could not send' }); }
});

// 3. DELETE GROUP MESSAGE - ONLY ADMIN
app.delete('/api/group-messages/:id', authh, async (req, res) => {
  try {
    const admin = await isGroupAdmin(req);
    if (!admin) return res.status(403).json({ error: 'Only admin can delete' });
    await GroupMessage.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not delete' }); }
});

// 4. MEMBER COUNT - ONLY ADMIN CAN SEE
app.get('/api/group-members-count', authh, async (req, res) => {
  try {
    const admin = await isGroupAdmin(req);
    if (!admin) return res.status(403).json({ error: 'Admin only' });
    const count = await User.countDocuments(); // all users = all group members
    res.json({ count });
  } catch (e) { res.status(500).json({ error: 'Could not count' }); }
});

// 5. ADMIN USER - So users can View Profile / Follow / Message Admin
app.get('/api/admin-user', authh, async (req, res) => {
  try {
    const admin = await User.findOne({ email: ADMIN_EMAIL }).select('_id username avatar email followers following bio');
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    res.json({ user: admin });
  } catch (e) { res.status(500).json({ error: 'Could not load admin' }); }
});

 // ===== FORGOT PASSWORD + RESET PASSWORD =====
// For: forgot.html / recover password page

// In-memory fallback if User model has no reset fields (still works)
const resetCodes = new Map(); // email -> {code, expiry}

// STEP 1: Send code
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Enter email' });

    const cleanEmail = email.toLowerCase().trim();

    // Find user - case insensitive
    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ message: 'No account with this email' });

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save to DB (if fields exist) + memory
    try {
      user.resetCode = code;
      user.resetCodeExpiry = expiry;
      await user.save();
    } catch(e) { console.log("Save code error:", e.message); }

    resetCodes.set(cleanEmail, { code, expiry });

    console.log(`🔑 Reset code for ${cleanEmail} = ${code}`);

    // For now we return code so your frontend can show it in the green box
    // When you add email sending later, REMOVE "code" from here
    return res.json({
      message: 'Code sent to ' + cleanEmail,
      code: code // <-- REMOVE THIS when you use real email
    });

  } catch(e) {
    console.log("FORGOT ERROR:", e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// STEP 2: Reset password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword, password } = req.body;
    const newPass = newPassword || password; // your frontend sends both

    if (!email || !code || !newPass) {
      return res.status(400).json({ message: 'Fill all fields' });
    }
    if (newPass.length < 6) {
      return res.status(400).json({ message: 'Password too short (min 6)' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = String(code).trim();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ message: 'No account with this email' });

    // Check code from DB or memory
    const stored = resetCodes.get(cleanEmail);
    const dbCode = user.resetCode ? String(user.resetCode) : null;
    const dbExpiry = user.resetCodeExpiry || (stored ? stored.expiry : null);

    const validCode = dbCode || (stored ? stored.code : null);

    if (!validCode || validCode !== cleanCode) {
      return res.status(400).json({ message: 'Invalid code' });
    }

    if (dbExpiry && Date.now() > new Date(dbExpiry).getTime()) {
      return res.status(400).json({ message: 'Code expired. Request a new one.' });
    }

    // Hash new password
    const hashed = await bcrypt.hash(newPass, 10);
    user.password = hashed;

    // Clear code so it can't be used again
    user.resetCode = "";
    user.resetCodeExpiry = null;
    await user.save();

    resetCodes.delete(cleanEmail);

    return res.json({ message: 'Password changed!' });

  } catch(e) {
    console.log("RESET ERROR:", e);
    return res.status(500).json({ message: 'Server error' });
  }
});

   
   // blog end here uytrewdrtgyhujkluytrrtyuiuytrevcdfgh
   // ytrefghjkkjhgfdfghjklkjhgfdsfghjklkjhgfdsfiuyfdjhg
   // uytrewuioiuytrertylkjhgfdghjhgfdfghjktretyiuytrjhg
   





   // pictures post gfhoifghjokpiuyttuiyttyuijopkoiuyfyohiuf


// --- SCHEMA - Name is Media ---
const mediaSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  img: {
    data: Buffer,
    contentType: String
  },
  fileName: String,
  size: Number,
  createdAt: { type: Date, default: Date.now, index: true }
});

// Fast pagination for one user
mediaSchema.index({ userId: 1, createdAt: -1 });
const Media = mongoose.model('Media', mediaSchema);

// --- YOUR OLD UPLOAD - KEPT ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 160 * 1024 * 1024 } });

// --- SAVE MEDIA - YOUR OLD CODE + FIX ---
app.post('/api/save-media', upload.single('file'), async (req, res) => {
  try {
    const { userId } = req.body;
    if(!req.file) return res.status(400).json({ error: 'No file' });
    if(!userId) return res.status(400).json({ error: 'No userId' });

    const newMedia = new Media({
      userId,
      img: { data: req.file.buffer, contentType: req.file.mimetype },
      fileName: req.file.originalname,
      size: req.file.size
    });
    await newMedia.save();
    res.json({ success: true, id: newMedia._id });
  } catch(err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// --- GET MEDIA - FIXED: 15 AT A TIME, NO BASE64 ---
app.get('/api/get-media', async (req, res) => {
  try {
    const { userId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;

    if(!userId) return res.json({ items: [], hasMore: false, page });

    // .select() = DO NOT load img.data here. That's the fix.
    const [media, total] = await Promise.all([
      Media.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id fileName size createdAt img.contentType') // no buffer!
        .lean(),
      Media.countDocuments({ userId })
    ]);

    // src now points to fast file endpoint, NOT base64
    const items = media.map(m => ({
      _id: m._id,
      fileName: m.fileName,
      createdAt: m.createdAt,
      src: `/api/media-file/${m._id}`
    }));

    res.json({
      items,
      hasMore: skip + items.length < total,
      total,
      page
    });
  } catch(e) {
    console.log(e);
    res.status(500).json({ error: e.message, items: [], hasMore: false });
  }
});

// --- SINGLE FILE - YOUR OLD CODE + FIX ---
app.get('/api/media-file/:id', async (req, res) => {
  try{
    const media = await Media.findById(req.params.id).select('img');
    if(!media || !media.img) return res.status(404).send('Not found');
    res.set('Content-Type', media.img.contentType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(media.img.data);
  }catch(e){ res.status(500).send(e.message); }
});

// --- DELETE - YOUR OLD CODE ---
app.delete('/api/delete-media/:id', async (req, res) => {
  try {
    await Media.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});


   
   //end here 0tdfghgifuytyoifuyogiuciohihguiohikh




     // start here note kjhgfdsdfghioiuytdsdfghjklkjhgfdsdfgh
   
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
      //1f6245b3640a4f8dbdcd4ef044526b30
      
      const API_KEY="04dfe64c981e43e88c16b3fd4b0003bc"; // Your football-data.org free key - 10 req/min limit
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
   let liveCache={data:[], time:0};
   
   // visitorCache = ANTI-SPAM for single IP.
   // If 1 person refreshes page 20 times in 10 seconds, without this = 20 API calls.
   // With this: same IP within 10 seconds gets cached data immediately.
   let visitorCache=new Map();
   
   // syncCache = PROTECTION FOR /api/sync - 2min cooldown so users can't spam sync and ban you.
   let syncCache={time:0,data:null};
   
   // ========== DATABASE MODEL ==========
   // We save matches in MongoDB so we NEVER call football-data for normal page loads.
   // Upcoming/Finished tabs read from this DB = 0 API calls = can handle unlimited users.
   // FIXED: Added watDate field - saves Lagos date (YYYY-MM-DD) so 10th night games don't shift to 11th
   const Match=mongoose.models.Match||mongoose.model("Match",new mongoose.Schema({
     _id:String,
     date:Date, // UTC date from API
     watDate:String, // FIXED: Lagos date string e.g. "2026-10-10" - this fixes today disappearing
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
   // FIXED: Now saves watDate = Lagos date so grouping in frontend uses Lagos date
   function format(m){
     const utc=new Date(m.utcDate);
     // FIXED: Convert UTC to Lagos date string. Example: 2026-10-10T23:00Z was shifting to 11th. watDate fixes it.
     const watDate=utc.toLocaleDateString("en-CA",{timeZone:"Africa/Lagos"});
     return{
       _id:String(m.id),
       date:utc, // keep UTC for sorting
       watDate:watDate, // FIXED: keep Lagos YYYY-MM-DD for display grouping - fixes today issue
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
       homeScore:m.score?.fullTime?.home??m.score?.halfTime?.home??null,
       awayScore:m.score?.fullTime?.away??m.score?.halfTime?.away??null,
       updatedAt:new Date()
     };
   }
   
   // ========== CORE: SYNC 9 DAYS BACK + 9 DAYS FRONT TO DB ==========
   async function fullSyncToDB(){
     if(isSyncing)return{synced:0,total:0}; // Lock check
     isSyncing=true;
     try{
       if(!process.env.MONGO_URL)throw Error("MONGO_URL missing in env vars");
       if(mongoose.connection.readyState!==1)
         await mongoose.connect(process.env.MONGO_URL);
   
       const past=await api("/matches",{
         dateFrom:getDate(-9),
         dateTo:getDate()
       });
       await new Promise(r=>setTimeout(r,6500)); // Wait 6.5 sec to avoid 10 req/min ban
       const future=await api("/matches",{
         dateFrom:getDate(1),
         dateTo:getDate(9)
       });
       const map=new Map();
       [...(past.matches||[]),...(future.matches||[])].forEach(m=>map.set(m.id,m));
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
       }
       return{synced:formatted.length,total:await Match.countDocuments()};
     }finally{
       isSyncing=false;
     }
   }
   
   // ========== CORE: GET MATCHES FROM DB - FIXED TODAY ISSUE ==========
   async function getMatches(type){
     let filter={};
     const now = new Date();
     const startPast = new Date(); startPast.setDate(now.getDate() - 2); startPast.setHours(0,0,0,0);
     const endFuture = new Date(); endFuture.setDate(now.getDate() + 9); endFuture.setHours(23,59,59,999);
     const start9DaysAgo = new Date(); start9DaysAgo.setDate(now.getDate() - 9); start9DaysAgo.setHours(0,0,0,0);
     const endTomorrow = new Date(); endTomorrow.setDate(now.getDate() + 1); endTomorrow.setHours(23,59,59,999);
   
     if(type==="upcoming"){
       filter={ date:{$gte:startPast,$lte:endFuture}, status:{$in:["SCHEDULED","TIMED","IN_PLAY","LIVE","PAUSED"]} };
     }else{
       filter={ date:{$gte:start9DaysAgo,$lte:endTomorrow}, status:{$in:["FINISHED","AWARDED"]} };
     }
     const matches=await Match.find(filter).lean();
     if(type==="finished"){ return matches.sort((a,b)=>new Date(b.date)-new Date(a.date)); }
     return matches.sort((a,b)=>new Date(a.date)-new Date(b.date));
   }
   
   // ========== ROUTE 1: /api/matches ==========
   app.get("/api/matches",async(req,res)=>{
     try{
       if(mongoose.connection.readyState!==1) await mongoose.connect(process.env.MONGO_URL);
       res.set("Cache-Control","no-store");
       const matches=await getMatches(req.query.tab||"upcoming");
       res.json({success:true,matches});
     }catch(e){ res.json({success:false,matches:[],error:e.message}); }
   });
   
   // ========== ROUTE 2: /api/live ==========
   app.get("/api/live",async(req,res)=>{
     res.set("Cache-Control","no-store");
     try{
       const now=Date.now();
       const ip=req.headers["x-forwarded-for"]||req.ip;
       if(visitorCache.has(ip)&&now-visitorCache.get(ip)<10000){
         return res.json({success:true,matches:liveCache.data,cached:true});
       }
       visitorCache.set(ip,now);
       if(now-liveCache.time<60000&&liveCache.data.length>0){
         return res.json({success:true,matches:liveCache.data,cached:true});
       }
       const today=await api("/matches",{dateFrom:getDate(),dateTo:getDate()});
       const live=(today.matches||[]).filter(m=>["IN_PLAY","PAUSED","LIVE"].includes(m.status));
       const formatted=live.map(format);
       liveCache={data:formatted, time:now};
       res.json({success:true,matches:formatted,cached:false});
     }catch(e){
       if(liveCache.data.length>0){ return res.json({success:true,matches:liveCache.data,cached:true}); }
       res.json({success:false,matches:[],error:e.message});
     }
   });
   
   // ========== ROUTE 3: /api/sync ==========
   app.get("/api/sync",async(req,res)=>{
     const now=Date.now();
     const COOLDOWN = 2*60*1000;
     try{
       if(mongoose.connection.readyState!==1) await mongoose.connect(process.env.MONGO_URL);
       if(now-syncCache.time<COOLDOWN && syncCache.data){
         return res.json({success:true,...syncCache.data,cached:true,message:"Sync cooldown 2min - RAM cached"});
       }
       const last = await Match.findOne().sort({updatedAt:-1});
       if(last && now - new Date(last.updatedAt).getTime() < COOLDOWN){
         return res.json({success:true,cached:true,total: await Match.countDocuments(),message:"Sync cooldown 2min - DB cached"});
       }
       if(isSyncing){ return res.json({success:false,cached:true,message:"Sync already running"}); }
       const r=await fullSyncToDB();
       syncCache={time:Date.now(),data:r};
       return res.json({success:true,...r,cached:false,timeWAT:new Date().toLocaleString("en-NG",{timeZone:"Africa/Lagos"}),message:`Synced ${r.synced} matches to DB`});
     }catch(e){ return res.json({success:false,error:e.message}); }
   });
   
   // matach end here kjhgfdghjkjhgfcghjkjhgf
   






   
   // CONFIG
   const API = process.env.API_FOOTBALL_KEY || '19ff9a571eb3c1a7bf5dc828fe578ffb';
   const BASE = 'https://v3.football.api-sports.io';
   const COOLDOWN = 2*60*60*1000; // 2 hours
   
   // DB SCHEMAS
   const countrySchema = new mongoose.Schema({
     fixture_id:{type:Number,unique:true}, home_team:String, away_team:String,
     home_logo:String, away_logo:String, league:String, league_logo:String,
     match_date:Date, status:String, elapsed:Number, score_home:Number, score_away:Number,
     last_updated:{type:Date,default:Date.now}
   });
   const CountryMatch = mongoose.models.CountryMatch || mongoose.model('CountryMatch', countrySchema);
   
   const controlSchema = new mongoose.Schema({
     _id:{type:String,default:'country-api'}, lastFetch:{type:Date,default:new Date(0)}, lockedUntil:{type:Date,default:new Date(0)}
   },{timestamps:true});
   const FetchControl = mongoose.models.CountryFetchControl || mongoose.model('CountryFetchControl', controlSchema);
   
   // STATUS
   const LIVE = new Set(['1H','HT','2H','ET','BT','P','LIVE','INT']);
   const DONE = new Set(['FT','AET','PEN']);
   
   // HELPERS
   const day = (d,n) => { const x=new Date(d); x.setUTCDate(x.getUTCDate()+n); return x.toISOString().slice(0,10); };
   const isCountry = (m) => {
     if(m.teams?.home?.national && m.teams?.away?.national) return true;
     const n=(m.league?.name||'').toLowerCase();
     return ['world cup','euro','nations league','afcon','asian cup','copa america','concacaf','gold cup','oceania','international friendly','friendlies'].some(x=>n.includes(x));
   };
   
   // FIXED FOR FREE PLAN: fetch day-by-day (from/to not allowed on free)
   async function getDays(from,to){
     const dates=[]; let cur=new Date(from); let end=new Date(to);
     while(cur<=end){ dates.push(cur.toISOString().slice(0,10)); cur.setUTCDate(cur.getUTCDate()+1); }
     
     let all=[];
     for(const d of dates){
       try{
         const r=await axios.get(`${BASE}/fixtures`,{
           params:{date:d}, // FREE plan uses date= not from/to
           headers:{'x-apisports-key':API},
           timeout:20000
         });
         console.log(`📅 ${d}: ${r.data?.results||0} matches`);
         if(r.data?.errors && Object.keys(r.data.errors).length) console.log('⚠️', r.data.errors);
         if(r.data?.response) all=all.concat(r.data.response);
         await new Promise(x=>setTimeout(x,650)); // avoid rate limit
       }catch(e){ console.log(`❌ ${d}:`, e.response?.data||e.message); }
     }
     return all;
   }
   
   async function reserveSlot(){
     const now=new Date();
     await FetchControl.updateOne({_id:'country-api'},{$setOnInsert:{lastFetch:new Date(0),lockedUntil:new Date(0)}},{upsert:true});
     const c=await FetchControl.findById('country-api').lean();
     if(!c) return {allowed:false,reason:'control unavailable'};
     if(c.lockedUntil && new Date(c.lockedUntil)>now) return {allowed:false,running:true,reason:'Fetch running'};
     const last=new Date(c.lastFetch||0);
     if(now-last < COOLDOWN) return {allowed:false,cooldown:true,lastFetch:last,nextAvailable:new Date(last.getTime()+COOLDOWN)};
     const locked=await FetchControl.findOneAndUpdate({_id:'country-api',lockedUntil:{$lte:now}},{$set:{lockedUntil:new Date(now.getTime()+30000)}},{new:true}).lean();
     if(!locked) return {allowed:false,running:true,reason:'Slot taken'};
     return {allowed:true,lastFetch:last};
   }
   async function recordFetch(){ await FetchControl.updateOne({_id:'country-api'},{$set:{lastFetch:new Date()}}); }
   async function releaseLock(){ try{ await FetchControl.updateOne({_id:'country-api'},{$set:{lockedUntil:new Date(0)}}); }catch{} }
   
   // MAIN SYNC: -3 to +3 days, 1 batch (7 API calls = 1 fetch per 4h)
   async function fetchCountryMatches(){
     if(!API) return {total:0,saved:0,deleted:0,error:'API key missing'};
     if(mongoose.connection.readyState!==1) await mongoose.connect(process.env.MONGO_URL||process.env.MONGO_URI);
     
     const now=new Date(); now.setUTCHours(0,0,0,0);
     const from=day(now,-3), to=day(now,3);
     
     const list=await getDays(from,to); // all matches in 7 days
     const country=list.filter(isCountry);
     console.log(`📅 ${from}->${to}: ${list.length} total -> ${country.length} country`);
   
     if(country.length){
       await CountryMatch.bulkWrite(country.map(m=>({updateOne:{
         filter:{fixture_id:m.fixture.id},
         update:{$set:{
           fixture_id:m.fixture.id, home_team:m.teams.home.name, away_team:m.teams.away.name,
           home_logo:m.teams.home.logo||'', away_logo:m.teams.away.logo||'',
           league:m.league?.name||'International', league_logo:m.league?.logo||'',
           match_date:new Date(m.fixture.date), status:m.fixture.status?.short||'NS',
           elapsed:m.fixture.status?.elapsed??null, score_home:m.goals?.home??null, score_away:m.goals?.away??null,
           last_updated:new Date()
         }}, upsert:true
       }})),{ordered:false});
     }
     const start=new Date(now); start.setUTCDate(start.getUTCDate()-3);
     const end=new Date(now); end.setUTCDate(end.getUTCDate()+3); end.setUTCHours(23,59,59,999);
     const d=await CountryMatch.deleteMany({$or:[{match_date:{$lt:start}},{match_date:{$gt:end}}]});
     
     console.log(`✅ API:${list.length} Saved:${country.length} Deleted:${d.deletedCount}`);
     return {total:list.length,saved:country.length,deleted:d.deletedCount};
   }
   
   // API: DB ONLY - NO API CALL
   app.get('/api/matches-country', async(req,res)=>{
     try{
       const tab=(req.query.tab||'upcoming').toLowerCase();
       const now=new Date(); now.setUTCHours(0,0,0,0);
       const start=new Date(now); start.setUTCDate(start.getUTCDate()-3);
       const end=new Date(now); end.setUTCDate(end.getUTCDate()+3); end.setUTCHours(23,59,59,999);
       let db=await CountryMatch.find({match_date:{$gte:start,$lte:end}}).lean();
   
       if(tab==='live') db=db.filter(m=>LIVE.has(m.status)).sort((a,b)=>new Date(b.match_date)-new Date(a.match_date));
       else if(['finished','recent','past'].includes(tab)) db=db.filter(m=>DONE.has(m.status)).sort((a,b)=>new Date(b.match_date)-new Date(a.match_date));
       else if(tab==='today'){ const tom=new Date(now); tom.setUTCDate(tom.getUTCDate()+1); db=db.filter(m=>{const d=new Date(m.match_date); return d>=now&&d<tom;}).sort((a,b)=>new Date(b.match_date)-new Date(a.match_date)); }
       else db=db.filter(m=>!DONE.has(m.status)).sort((a,b)=>{ const al=LIVE.has(a.status)?1:0, bl=LIVE.has(b.status)?1:0; if(bl!==al) return bl-al; return new Date(b.match_date)-new Date(a.match_date); }); // FIXED: recent at top
   
       res.json({success:true,count:db.length,matches:db.map(m=>({
         id:m.fixture_id, league:m.league, leagueLogo:m.league_logo, date:m.match_date,
         status:DONE.has(m.status)?'FINISHED':LIVE.has(m.status)?'IN_PLAY':'SCHEDULED',
         home:{name:m.home_team,logo:m.home_logo}, away:{name:m.away_team,logo:m.away_logo},
         homeScore:m.score_home, awayScore:m.score_away, elapsed:m.elapsed, rawStatus:m.status
       }))});
     }catch(e){ res.status(500).json({success:false,matches:[],error:e.message}); }
   });
   
   app.get('/api/country-matches', async(req,res)=>{
     try{
       const now=new Date(); now.setUTCHours(0,0,0,0);
       const s=new Date(now); s.setUTCDate(s.getUTCDate()-3);
       const e=new Date(now); e.setUTCDate(e.getUTCDate()+3); e.setUTCHours(23,59,59,999);
       res.json(await CountryMatch.find({match_date:{$gte:s,$lte:e}}).sort({match_date:-1}).lean());
     }catch(e){ res.status(500).json([]); }
   });
   
   // ONLY THIS ROUTE CALLS API - 4 HOUR COOLDOWN + FORCE RESET
   // Normal:  localhost:8000/api/fetch-now
   // Force:   localhost:8000/api/fetch-now?reset=1
   app.get('/api/fetch-now', async(req,res)=>{
     req.setTimeout(30000);
     res.setHeader('Content-Type','application/json');
     let slot=null;
     try{
       const MONGO=process.env.MONGO_URI||process.env.MONGO_URL;
       if(!MONGO) return res.status(500).json({success:false,message:'MongoDB missing'});
       if(mongoose.connection.readyState!==1) await mongoose.connect(MONGO,{serverSelectionTimeoutMS:5000});
   
       if(req.query.reset==='1' || req.query.force==='true'){
         await FetchControl.deleteOne({_id:'country-api'});
         console.log('⚠️ COOLDOWN RESET - FORCED FETCH');
       }
   
       slot=await reserveSlot();
       if(!slot.allowed && slot.running) return res.json({success:false,cached:true,running:true,message:'Fetch already running.'});
       if(!slot.allowed && slot.cooldown){
         const ms=slot.nextAvailable-Date.now(), h=Math.floor(ms/3600000), m=Math.ceil((ms%3600000)/60000);
         return res.json({success:false,cached:true,cooldown:true,message:`Cooldown active. Try again in ${h}h ${m}m. Use ?reset=1 to force`,lastFetch:slot.lastFetch,nextAvailable:slot.nextAvailable,cooldownHours:2});
       }
   
       console.log('🚀 Fetching -3 to +3 days...');
       await recordFetch();
       const result=await fetchCountryMatches();
       await releaseLock();
       
       const count=await CountryMatch.countDocuments();
       return res.json({success:!result.error,message:result.error?'Fetch failed':'Fetch complete',synced:result.saved,apiTotal:result.total,deleted:result.deleted,totalInDB:count,cooldownHours:4,nextAvailable:new Date(Date.now()+COOLDOWN),time:new Date().toISOString()});
     }catch(e){
       await releaseLock();
       console.log('❌ fetch-now error:',e.message);
       return res.status(500).json({success:false,message:'Fetch failed',error:e.message,totalInDB:await CountryMatch.countDocuments().catch(()=>0)});
     }
   });
   
   // country match end here kjhgcfghhgxuygfxyf
   

    app.listen(port, () => console.log('server is running on port ' + port));