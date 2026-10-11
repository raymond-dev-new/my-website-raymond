import express from 'express'
import dotenv from 'dotenv'
dotenv.config()
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import user from './model/user.js';
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

const app = express()
const port = process.env.PORT || 8000
const JWT_SECRET = process.env.JWT_SECRET
const JWT_SECRETT = 'jhgfdghjkhytredfgjhkjhgjfhdgsHJJHDKJHRHJERKJhkgjhjfhdgsHJJHDKJHRHJERKJhkgjhjbknhghfdgjhkjkh'
const url = process.env.MONGO_URL

app.use(cors({ origin: "*" }));
app.use(bordyparser.json());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'frontend')))
app.use((req, res, next) => { console.log(` ${req.method} ${req.url}`); next(); })

mongoose.connect(url).then(() => console.log("MongoDB Connected")).catch(err => console.log(err));
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'frontend', 'register.html')); })

let io;
const safeEmit = (room, event, data) => { try { if(io) io.to(room).emit(event, data); } catch(e){} }
const SECRET = "secret123";
function authh(req, res, next) {
  const tokenN = req.headers.authorization;
  if (!tokenN) return res.status(401).json({ msg: "No token" });
  try { req.userId = jwt.verify(tokenN, SECRET).id; next(); }
  catch { return res.status(401).json({ msg: "Invalid" }); }
}

const uploadd = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// MODELS - DEFINED EARLY
const Userd = mongoose.model('User', new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: "" },
  bio: { type: String, default: "" },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
}, { timestamps: true }));

const Post = mongoose.model('Post', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, default: 'image' },
  mediaUrl: String,
  caption: String,
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, text: String, createdAt: { type: Date, default: Date.now } }],
  views: { type: Number, default: 0 },
  shares: { type: Number, default: 0 }
}, { timestamps: true }));

const Message = mongoose.model('Message', new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  read: { type: Boolean, default: false },
  edited: { type: Boolean, default: false }
}, { timestamps: true }));

const Notification = mongoose.model('Notification', new mongoose.Schema({
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['like','comment','follow','message'] },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  text: { type: String, default: "" },
  read: { type: Boolean, default: false }
}, { timestamps: true }));

const MediaSchema = new mongoose.Schema({
  userId: String,
  img: { data: Buffer, contentType: String },
  createdAt: { type: Date, default: Date.now }
});
const Media = mongoose.model('Media', MediaSchema);

async function createNotif(receiverId, senderId, type, postId=null, text=""){
  if(receiverId.toString()===senderId.toString()) return;
  if(type==='like'){
    const exists = await Notification.findOne({ receiver:receiverId, sender:senderId, type:'like', post:postId });
    if(exists){ await Notification.findByIdAndDelete(exists._id); return null; }
  }
  const n = await Notification.create({ receiver:receiverId, sender:senderId, type, post:postId, text });
  const populated = await Notification.findById(n._id).populate('sender','username avatar').populate('post','mediaUrl caption');
  safeEmit(receiverId.toString(), 'newNotification', populated);
  return populated;
}

// AUTH
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = await Userd.create({ username, email, password: hashed });
  const token = jwt.sign({ id: user._id }, SECRET);
  res.json({ token, user });
});
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await Userd.findOne({ email });
  if (!user) return res.json({ msg: "Not found" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.json({ msg: "Wrong pass" });
  const token = jwt.sign({ id: user._id }, SECRET);
  res.json({ token, user });
});

app.post('/api/upload', authh, uploadd.single('file'), (req, res) => {
  if(!req.file) return res.status(400).json({msg:"No file"});
  const b64 = req.file.buffer.toString('base64');
  const dataUrl = `data:${req.file.mimetype};base64,${b64}`;
  res.json({ url: dataUrl });
});

app.put('/api/users/avatar', authh, uploadd.single('file'), async (req, res) => {
  const userDoc = await Userd.findById(req.userId);
  if(!userDoc) return res.status(404).json({msg:"User not found"});
  if(!req.file) return res.status(400).json({msg:"No file"});
  const b64 = req.file.buffer.toString('base64');
  userDoc.avatar = `data:${req.file.mimetype};base64,${b64}`;
  await userDoc.save();
  res.json(userDoc);
});
app.delete('/api/users/avatar', authh, async (req,res)=>{
  const user = await Userd.findById(req.userId);
  if(!user) return res.status(404).json({msg:"Not found"});
  user.avatar = ""; await user.save(); res.json(user);
});
app.get('/api/users/me/profile', authh, async (req, res) => {
  const user = await Userd.findById(req.userId).populate('followers','username avatar').populate('following','username avatar');
  const posts = await Post.find({ user: user._id }).sort({ createdAt: -1 });
  res.json({ user, posts, followersCount: user.followers.length, followingCount: user.following.length });
});

// POSTS - IMAGE + VIDEO BOTH WORKING
app.post('/api/posts', authh, uploadd.single('file'), async (req, res) => {
  try{
    let mediaUrl = req.body.mediaUrl || "";
    let type = req.body.type || 'image';
    if(req.file){
      if(req.file.mimetype.startsWith('video')){
        if(req.file.size > 30*1024*1024) return res.status(400).json({msg: "Video too big max 30MB"});
        const media = await Media.create({
          userId: req.userId,
          img: { data: req.file.buffer, contentType: req.file.mimetype }
        });
        mediaUrl = `/api/media-file/${media._id}`;
        type = 'video';
      } else {
        if(req.file.size > 6*1024*1024) return res.status(400).json({msg: "Image too big max 6MB"});
        const b64 = req.file.buffer.toString('base64');
        mediaUrl = `data:${req.file.mimetype};base64,${b64}`;
        type = 'image';
      }
    }
    const post = await Post.create({ user: req.userId, caption: req.body.caption || "", mediaUrl, type });
    res.json(post);
  }catch(e){
    console.error(e);
    res.status(500).json({msg: e.message});
  }
});

app.delete('/api/posts/:id', authh, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ msg: "Post not found" });
  if (post.user.toString()!== req.userId) return res.status(403).json({ msg: "Not yours" });
  await Post.findByIdAndDelete(req.params.id); res.json({ msg: "Deleted" });
});
app.put('/api/posts/:id', authh, async (req, res) => {
  const post = await Post.findByIdAndUpdate(req.params.id, { caption: req.body.caption }, { new: true });
  res.json(post);
});
app.get('/api/posts/feed', authh, async (req, res) => {
  const posts = await Post.find().populate('user').populate('comments.user').sort({ createdAt: -1 });
  res.json(posts);
});
app.get('/api/posts/reels', async (req, res) => {
  const reels = await Post.find({ type: 'video' }).populate('user').populate('comments.user').sort({ createdAt: -1 });
  res.json(reels);
});
app.get('/api/posts/:id', authh, async (req, res) => {
  const post = await Post.findById(req.params.id).populate('user').populate('comments.user');
  if (!post) return res.status(404).json({ msg: "Post not found" });
  res.json(post);
});
app.post('/api/posts/:id/like', authh, async (req, res) => {
  const post = await Post.findById(req.params.id);
  const isLiked = post.likes.includes(req.userId);
  if(isLiked) post.likes.pull(req.userId); else post.likes.push(req.userId);
  await post.save();
  if(!isLiked) await createNotif(post.user, req.userId, 'like', post._id);
  else { await Notification.deleteMany({ receiver:post.user, sender:req.userId, type:'like', post:post._id }); }
  const updated = await Post.findById(req.params.id).populate('user').populate('comments.user');
  res.json(updated);
});
app.post('/api/posts/:id/comment', authh, async (req, res) => {
  const post = await Post.findById(req.params.id);
  post.comments.push({ user: req.userId, text: req.body.text });
  await post.save();
  await createNotif(post.user, req.userId, 'comment', post._id, req.body.text);
  const updated = await Post.findById(req.params.id).populate('user').populate('comments.user');
  res.json(updated);
});
app.post('/api/posts/:id/share', authh, async (req, res) => {
  const post = await Post.findById(req.params.id); post.shares += 1; await post.save(); res.json(post);
});
app.post('/api/posts/:id/save', authh, async (req, res) => {
  const me = await Userd.findById(req.userId);
  me.savedPosts.includes(req.params.id)? me.savedPosts.pull(req.params.id) : me.savedPosts.push(req.params.id);
  await me.save(); res.json(me.savedPosts);
});
app.post('/api/posts/:id/view', async (req, res) => {
  const post = await Post.findById(req.params.id);
  if(!post) return res.status(404).json({ msg: "Not found" });
  post.views += 1; await post.save(); res.json({ views: post.views });
});
app.get('/api/users/:id', async (req, res) => {
  const user = await Userd.findById(req.params.id).populate('followers', 'username avatar').populate('following', 'username avatar');
  if (!user) return res.status(404).json({ msg: "User not found" });
  const posts = await Post.find({ user: user._id }).sort({ createdAt: -1 });
  res.json({ user, posts, followersCount: user.followers.length, followingCount: user.following.length });
});
app.post('/api/users/:id/follow', authh, async (req, res) => {
  if(req.params.id === req.userId) return res.status(400).json({ msg: "Can't follow yourself" });
  const target = await Userd.findById(req.params.id);
  const me = await Userd.findById(req.userId);
  if (!target ||!me) return res.status(404).json({ msg: "User not found" });
  const isFollowing = me.following.includes(target._id);
  if (isFollowing) {
    me.following.pull(target._id); target.followers.pull(me._id);
    await Notification.deleteMany({ receiver:target._id, sender:me._id, type:'follow' });
  } else {
    me.following.push(target._id); target.followers.push(me._id);
    await createNotif(target._id, me._id, 'follow');
  }
  await me.save(); await target.save();
  const updatedTarget = await Userd.findById(target._id).populate('followers','username').populate('following','username');
  res.json({ me, target: updatedTarget, isFollowing:!isFollowing });
});
app.get('/api/explore', async (req, res) => {
  const q = req.query.q;
  if (q) { const users = await Userd.find({ username: { $regex: q, $options: 'i' } }); return res.json(users); }
  const posts = await Post.find().populate('user').sort({ likes: -1 }).limit(20);
  res.json(posts);
});
app.get('/api/notifications', authh, async (req, res) => {
  const notifs = await Notification.find({ receiver: req.userId }).populate('sender','username avatar').populate('post','mediaUrl').sort({ createdAt: -1 }).limit(50);
  res.json(notifs);
});
app.get('/api/notifications/count', authh, async (req, res) => {
  const count = await Notification.countDocuments({ receiver: req.userId, read: false });
  res.json({ count });
});
app.post('/api/notifications/read', authh, async (req, res) => {
  await Notification.updateMany({ receiver: req.userId, read: false }, { read: true });
  res.json({ ok:true });
});
app.get('/api/messages/users', authh, async (req, res) => {
  const me = await Userd.findById(req.userId).populate('followers','username avatar').populate('following','username avatar');
  if(!me) return res.json([]);
  const combined = [...me.followers,...me.following];
  const unique = [...new Map(combined.map(u => [u._id.toString(), u])).values()];
  res.json(unique);
});
app.get('/api/messages/unread/counts', authh, async (req, res) => {
  const unread = await Message.aggregate([
    { $match: { receiver: new mongoose.Types.ObjectId(req.userId), read: false } },
    { $group: { _id: "$sender", count: { $sum: 1 } } }
  ]);
  const map = {}; unread.forEach(u => map[u._id.toString()] = u.count); res.json(map);
});
app.post('/api/messages/:id/read', authh, async (req, res) => {
  await Message.updateMany({ sender: req.params.id, receiver: req.userId, read: false }, { read: true });
  safeEmit(req.params.id, 'messagesSeen', { by: req.userId });
  res.json({ ok: true });
});
app.get('/api/messages/:id', authh, async (req, res) => {
  const msgs = await Message.find({ $or: [{ sender: req.userId, receiver: req.params.id }, { sender: req.params.id, receiver: req.userId }] }).sort({ createdAt: 1 }).populate('sender','username').populate('receiver','username');
  res.json(msgs);
});
app.put('/api/messages/msg/:msgId', authh, async (req, res) => {
  const m = await Message.findById(req.params.msgId);
  if(!m) return res.status(404).json({msg:"Not found"});
  if(m.sender.toString()!== req.userId) return res.status(403).json({msg:"Not yours"});
  m.text = req.body.text; m.edited = true; await m.save();
  const populated = await Message.findById(m._id).populate('sender','username').populate('receiver','username');
  safeEmit(m.receiver.toString(), 'messageEdited', populated);
  safeEmit(m.sender.toString(), 'messageEdited', populated);
  res.json(populated);
});
app.delete('/api/messages/msg/:msgId', authh, async (req, res) => {
  const m = await Message.findById(req.params.msgId);
  if(!m) return res.status(404).json({msg:"Not found"});
  const isSender = m.sender.toString() === req.userId;
  const isReceiver = m.receiver.toString() === req.userId;
  if(!isSender &&!isReceiver) return res.status(403).json({msg:"Not allowed"});
  const data = { _id: m._id, sender: m.sender, receiver: m.receiver };
  await Message.findByIdAndDelete(req.params.msgId);
  safeEmit(data.receiver.toString(), 'messageDeleted', data);
  safeEmit(data.sender.toString(), 'messageDeleted', data);
  res.json({ok:true});
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 100 * 1024 * 1024 } });

app.post('/api/save-media', upload.single('file'), async (req, res) => {
  try {
    const { userId } = req.body;
    const newMedia = new Media({ userId, img: { data: req.file.buffer, contentType: req.file.mimetype } });
    await newMedia.save(); res.json({ success: true, id: newMedia._id });
  } catch(err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/get-media', async (req, res) => {
  const { userId } = req.query;
  const media = await Media.find({ userId }).sort({ createdAt: -1 });
  const result = media.map(m => ({ _id: m._id, src: `data:${m.img.contentType};base64,${m.img.data.toString('base64')}` }));
  res.json(result);
});
app.get('/api/media-file/:id', async (req, res) => {
  try{
    const media = await Media.findById(req.params.id);
    if(!media) return res.status(404).send('Not found');
    res.set('Content-Type', media.img.contentType);
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(media.img.data);
  }catch(e){ res.status(500).send(e.message); }
});
app.delete('/api/delete-media/:id', async (req, res) => {
  await Media.findByIdAndDelete(req.params.id); res.json({ success: true });
});

if (process.env.NODE_ENV!== 'production') {
  const server = http.createServer(app);
  io = new Server(server, { cors: { origin: "*" } });
  io.on('connection', (socket) => {
    socket.on('join', (id) => socket.join(id));
    socket.on('sendMessage', async (d) => {
      const m = await Message.create({ sender: d.sender, receiver: d.receiver, text: d.text, read: false });
      const populated = await Message.findById(m._id).populate('sender','username').populate('receiver','username');
      safeEmit(d.receiver, 'receiveMessage', populated);
      safeEmit(d.sender, 'receiveMessage', populated);
    });
  });
  server.listen(port, () => console.log('server is running on port ' + port));
}
export default app;