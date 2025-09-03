import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Configuración ----
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Primero intentamos usar /data (Render Disk). Si falla, caemos a ./data junto al server.
async function resolveDataDir() {
  const preferred = process.env.DATA_DIR || '/data';
  try {
    await fs.mkdir(preferred, { recursive: true });
    return preferred; // existe o se pudo crear
  } catch (e) {
    // sin permisos para /data => usamos local ./data
    const fallback = path.join(__dirname, 'data');
    await fs.mkdir(fallback, { recursive: true });
    return fallback;
  }
}

const DATA_DIR = await resolveDataDir();
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'data.json');

await fs.mkdir(UPLOADS_DIR, { recursive: true });
// si no existe data.json, crealo
try {
  await fs.access(DB_FILE);
} catch {
  await fs.writeFile(DB_FILE, JSON.stringify({ products: [] }, null, 2));
}


// ---- Middlewares ----
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/', express.static(path.join(__dirname, 'public')));

// Multer storage to UPLOADS_DIR with safe filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${Date.now()}-${nanoid(8)}${ext}`);
  }
});
const upload = multer({ storage });

// ---- Helpers ----
async function readDB(){
  const raw = await fs.readFile(DB_FILE, 'utf-8');
  return JSON.parse(raw);
}
async function writeDB(db){
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}
function authMiddleware(req, res, next){
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if(!token) return res.status(401).json({ error: 'No token' });
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  }catch(e){
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// ---- Auth ----
app.post('/api/login', (req, res)=>{
  const { user, pass } = req.body || {};
  if(user === ADMIN_USER && pass === ADMIN_PASS){
    const token = jwt.sign({ user }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token, user });
  }
  return res.status(401).json({ error: 'Credenciales inválidas' });
});

// ---- Products (public GET) ----
app.get('/api/products', async (req, res)=>{
  const db = await readDB();
  // newest first
  const list = [...db.products].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  res.json(list);
});

// Create product
app.post('/api/products', authMiddleware, async (req, res)=>{
  const { title, price=0, category='', dimensions='', materials='', finish='', stock=0, imageURL='' } = req.body || {};
  if(!title) return res.status(400).json({ error: 'title requerido' });
  const db = await readDB();
  const p = {
    id: nanoid(10),
    title, price, category, dimensions, materials, finish, stock,
    imageURL: imageURL || '',
    imagePath: '', // set if uploaded via /api/upload
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  db.products.push(p);
  await writeDB(db);
  res.json(p);
});

// Update product
app.put('/api/products/:id', authMiddleware, async (req, res)=>{
  const id = req.params.id;
  const db = await readDB();
  const idx = db.products.findIndex(p => p.id === id);
  if(idx === -1) return res.status(404).json({ error: 'no existe' });
  const p = db.products[idx];
  const fields = ['title','price','category','dimensions','materials','finish','stock','imageURL','imagePath'];
  for(const k of fields){
    if(k in req.body) p[k] = req.body[k];
  }
  p.updatedAt = Date.now();
  db.products[idx] = p;
  await writeDB(db);
  res.json(p);
});

// Delete product
app.delete('/api/products/:id', authMiddleware, async (req, res)=>{
  const id = req.params.id;
  const db = await readDB();
  const idx = db.products.findIndex(p => p.id === id);
  if(idx === -1) return res.status(404).json({ error: 'no existe' });
  const p = db.products[idx];
  if(p.imagePath){
    try{ await fs.unlink(path.join(UPLOADS_DIR, p.imagePath)); }catch{}
  }
  db.products.splice(idx, 1);
  await writeDB(db);
  res.json({ ok: true });
});

// Upload image
app.post('/api/upload', authMiddleware, upload.single('image'), async (req, res)=>{
  const file = req.file;
  if(!file) return res.status(400).json({ error: 'file requerido' });
  const publicPath = `/uploads/${file.filename}`;
  res.json({ url: publicPath, path: file.filename });
});

// Health
app.get('/api/health', (req,res)=> res.json({ ok: true }));

app.listen(PORT, ()=>{
  console.log('CTI Furniture running on ' + PORT);
});
