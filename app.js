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
//import bordyparser from 'body-parser'
import axios from 'axios'
import multer from 'multer'
import fs from 'fs'
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import {v2 as cloudinary } from 'cloudinary';
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import { put, del } from '@vercel/blob'; // <-- NEW
const app = express()


const port = process.env.PORT || 8000
const JWT_SECRET = process.env.JWT_SECRET
const url = process.env.MONGO_URL

 

//app.use(cors())
app.use(cors({ origin: "*",
  methods: ["GET", "POST" , "DELETE"]
 }));

app.use(cors({ origin: "*" }));
//app.use(bodyParser.json({ limit: '10mb' })); // for metadata
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

// 3. MONGOOSE SCHEMA
const mediaSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // this is the email
  url: { type: String, required: true },
  type: { type: String }, // image or video
  public_id: { type: String },
  createdAt: { type: Date, default: Date.now }
});
const Media = mongoose.model('Media', mediaSchema);

// 4. ROUTES

// SAVE - after frontend uploads to cloudinary
app.post('/api/save-media', async (req, res) => {
  try {
    const { userId, url, type, public_id } = req.body;
    if (!userId || !url) return res.status(400).json({ error: "Missing userId or url" });
    
    const newMedia = new Media({ userId, url, type, public_id });
    await newMedia.save();
    res.json({ success: true, data: newMedia });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET - THIS IS WHAT FIXES MULTI-DEVICE
app.get('/api/get-media', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    
    const items = await Media.find({ userId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
app.delete('/api/delete-media/:id', async (req, res) => {
  try {
    await Media.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
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

  // start here iuytrertyuiopiuytrtyuytrtyuiuytrtyuiuytfyuiuyt


// MULTER - use memory storage for Vercel Blob
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
});


// MONGOOSE SCHEMA
const mediaSchemal = new mongoose.Schema({
  email: { type: String, required: true }, // this is the user
  url: { type: String, required: true }, // blob public url
  blobPath: { type: String, required: true }, // needed to delete
  type: { type: String, required: true }, // image or video
  filename: { type: String },
  size: { type: Number },
  createdAt: { type: Date, default: Date.now }
});
const Medial = mongoose.model('savedIM', mediaSchemal);


// 1. UPLOAD ROUTE - TO VERCEL BLOB
app.post('/get/api/upload-blob', upload.single('file'), async (req, res) => {
  try {
    const { userId } = req.body; // userId = email from frontend
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // Upload to Vercel Blob
    const blob = await put(`vault/${userId}/${Date.now()}-${file.originalname}`, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
    });

    const fileType = file.mimetype.startsWith('video') ? 'video' : 'image';

    // Save to MongoDB
    const newMedia = new Medial({
      email: userId,
      url: blob.url,
      blobPath: blob.pathname,
      type: fileType,
      filename: file.originalname,
      size: file.size
    });
    await newMedia.save();

    res.json({ success: true, url: blob.url, id: newMedia._id });

  } catch(err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// 2. GET MEDIA FOR USER
app.get('/get/api/get-media', async (req, res) => {
  try {
    const { userId } = req.query; // email
    const mediaList = await Medial.find({ email: userId }).sort({ createdAt: -1 });
    res.json(mediaList);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});


// 3. DELETE MEDIA
app.delete('/get/api/delete-blob/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { blobPath } = req.body;

    // Delete from Vercel Blob
    if(blobPath) await del(blobPath);
    // Delete from MongoDB
    await Medial.findByIdAndDelete(id);

    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});


  //end here tretyuiouytryuiouytrtyuiouytryuiuytfgiu
  

  app.listen(port, console.log('server is running on port 8000')
  )
  