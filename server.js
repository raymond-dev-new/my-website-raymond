import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
dotenv.config()

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
   console.log(`  ${req.method}  ${req.url}`);
   next();
})

const port = 5000
const JWT_SECRET = "ihfghjkdjhvhjdhvbnfkerufyhijihekjdfenechvbejy";
const ADMIN_PASSWORD = "123456";
const url = process.env.MONGO_URL

mongoose.connect(url)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// --- MODELS ---
const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  referenceCode: String,
  ngnBalance: { type: Number, default: 0 },
  usdBalance: { type: Number, default: 0 },
});
const NewUser = mongoose.model('NewUser', UserSchema);

const PendingSchema = new mongoose.Schema({
  referenceCode: String,
  email: String,
  amount: Number,
  type: String,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const Pending = mongoose.model('Pending', PendingSchema);

const WithdrawSchema = new mongoose.Schema({
  referenceCode: String,
  email: String,
  amount: Number,
  bankName: String,
  accountNumber: String,
  accountName: String,
  type: String,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const Withdraw = mongoose.model('Withdraw', WithdrawSchema);

// NEW: Transaction history
const TransactionSchema = new mongoose.Schema({
  referenceCode: String,
  type: String,
  amount: Number,
  status: String,
  details: String,
  createdAt: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', TransactionSchema);

// --- AUTH ---
app.post('/api/signup', async (req,res)=>{
  const { email, password } = req.body;
  const exists = await NewUser.findOne({email});
  if(exists) return res.json({error: "Email exists"});
  
  const count = await NewUser.countDocuments();
  const ref = `USER${String(count + 1).padStart(4,'0')}`;
  
  const hashed = await bcrypt.hash(password, 10);
  const user = await NewUser.create({ email, password: hashed, referenceCode: ref });
  
  const token = jwt.sign({ id: user._id }, JWT_SECRET);
  res.json({ token, referenceCode: ref, email });
});

app.post('/api/login', async (req,res)=>{
  const { email, password } = req.body;
  const user = await NewUser.findOne({email});
  if(!user) return res.json({error: "No user"});
  const ok = await bcrypt.compare(password, user.password);
  if(!ok) return res.json({error: "Wrong password"});
  const token = jwt.sign({ id: user._id }, JWT_SECRET);
  res.json({ token, referenceCode: user.referenceCode, email });
});

function authMiddleware(req,res,next){
  const token = req.headers.authorization?.split(' ')[1];
  if(!token) return res.json({error: "No token"});
  try{
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  }catch{ 
    return res.json({error: "Invalid token"}) 
  }
}

app.get('/api/me', authMiddleware, async (req,res)=>{
  const user = await NewUser.findById(req.userId);
  if(!user) return res.json({error: "User not found"});
  res.json({ email: user.email, referenceCode: user.referenceCode, ngnBalance: user.ngnBalance, usdBalance: user.usdBalance });
});

// --- DEPOSITS ---
app.post('/api/deposit/claim-ngn', authMiddleware, async (req,res)=>{
  const { amount } = req.body;
  const user = await NewUser.findById(req.userId);
  await Pending.create({ referenceCode: user.referenceCode, email: user.email, amount: Number(amount), type: 'ngn' });
  await Transaction.create({ referenceCode: user.referenceCode, type: 'deposit-ngn', amount: Number(amount), status: 'pending', details: 'PalmPay deposit' });
  res.json({ success: true });
});

app.post('/api/deposit/claim-usd', authMiddleware, async (req,res)=>{
  const { amount } = req.body;
  const user = await NewUser.findById(req.userId);
  await Pending.create({ referenceCode: user.referenceCode, email: user.email, amount: Number(amount), type: 'usd' });
  await Transaction.create({ referenceCode: user.referenceCode, type: 'deposit-usd', amount: Number(amount), status: 'pending', details: 'GeegPay deposit' });
  res.json({ success: true });
});

// --- WITHDRAWAL - FIXED ---
app.post('/api/withdraw/request', authMiddleware, async (req,res)=>{
  try{
    const { amount, bankName, accountNumber, accountName, type } = req.body;
    const user = await NewUser.findById(req.userId);
    if(!user) return res.json({error: "User not found"});
    
    if(type==='ngn' && user.ngnBalance < Number(amount)) return res.json({error: `Insufficient NGN. You have ₦${user.ngnBalance}`});
    if(type==='usd' && user.usdBalance < Number(amount)) return res.json({error: `Insufficient USD. You have $${user.usdBalance}`});

    if(type==='ngn') user.ngnBalance -= Number(amount);
    if(type==='usd') user.usdBalance -= Number(amount);
    await user.save();

    const w = await Withdraw.create({ 
      referenceCode: user.referenceCode,
      email: user.email,
      amount: Number(amount), 
      bankName, accountNumber, accountName, type 
    });
    await Transaction.create({ 
      referenceCode: user.referenceCode, 
      type: `withdraw-${type}`, 
      amount: Number(amount), 
      status: 'pending', 
      details: `${bankName} ${accountNumber}` 
    });
    console.log(`NEW WITHDRAWAL: ${w.referenceCode} ${type} ${amount}`);
    res.json({success: true});
  }catch(e){ console.log(e); res.json({error: "Server error"}) }
});

app.get('/api/transactions', authMiddleware, async (req,res)=>{
  const user = await NewUser.findById(req.userId);
  const tx = await Transaction.find({ referenceCode: user.referenceCode }).sort({ createdAt: -1 }).limit(50);
  res.json(tx);
});

// --- ADMIN ---
app.post('/api/admin/login', (req,res)=>{
  if(req.body.password === ADMIN_PASSWORD) res.json({ success: true });
  else res.json({ error: "Wrong admin password" });
});

app.get('/api/admin/pending-deposits', async (req,res)=>{
  const pendings = await Pending.find({ status: 'pending' }).sort({ createdAt: -1 });
  res.json(pendings);
});

app.post('/api/admin/credit-ngn', async (req,res)=>{
  const { referenceCode, amount } = req.body;
  await NewUser.findOneAndUpdate({ referenceCode }, { $inc: { ngnBalance: Number(amount) } });
  await Pending.findOneAndDelete({ referenceCode, amount: Number(amount), type: 'ngn' });
  await Transaction.findOneAndUpdate({ referenceCode, amount: Number(amount), type: 'deposit-ngn', status: 'pending' }, { status: 'approved' });
  res.json({ success: true });
});

app.post('/api/admin/credit-usd', async (req,res)=>{
  const { referenceCode, amount } = req.body;
  await NewUser.findOneAndUpdate({ referenceCode }, { $inc: { usdBalance: Number(amount) } });
  await Pending.findOneAndDelete({ referenceCode, amount: Number(amount), type: 'usd' });
  await Transaction.findOneAndUpdate({ referenceCode, amount: Number(amount), type: 'deposit-usd', status: 'pending' }, { status: 'approved' });
  res.json({ success: true });
});

app.get('/api/admin/withdrawals', async (req,res)=>{
  const list = await Withdraw.find({ status: 'pending' }).sort({ createdAt: -1 });
  res.json(list);
});

app.post('/api/admin/approve-withdraw', async (req,res)=>{
  const { id } = req.body;
  await Withdraw.findByIdAndUpdate(id, { status: 'approved' });
  const w = await Withdraw.findById(id);
  if(w) await Transaction.findOneAndUpdate({ referenceCode: w.referenceCode, amount: w.amount, type: `withdraw-${w.type}`, status: 'pending' }, { status: 'approved' });
  res.json({success: true});
});

app.post('/api/admin/reject-withdraw', async (req,res)=>{
  const { id } = req.body;
  const w = await Withdraw.findById(id);
  if(w){
    const user = await NewUser.findOne({ referenceCode: w.referenceCode });
    if(user){
      if(w.type==='ngn') user.ngnBalance += w.amount;
      else user.usdBalance += w.amount;
      await user.save();
    }
    await Withdraw.findByIdAndDelete(id);
    await Transaction.findOneAndDelete({ referenceCode: w.referenceCode, amount: w.amount, type: `withdraw-${w.type}`, status: 'pending' });
  }
  res.json({success: true});
});

app.listen(port, ()=> console.log(`Server running on ${port}`));