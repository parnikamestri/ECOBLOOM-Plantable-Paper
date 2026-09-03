import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
const makeToken = user => jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const safeUser = u => ({ id: u.user_id, name: u.name, email: u.email, phone: u.phone || '', role: u.role });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const normalized = email.toLowerCase().trim();
    const [exists] = await pool.query('SELECT user_id FROM users WHERE email=? LIMIT 1', [normalized]);
    if (exists.length) return res.status(409).json({ message: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users(name,email,password) VALUES(?,?,?)', [name.trim(), normalized, hash]);
    const user = { user_id: result.insertId, name: name.trim(), email: normalized, phone: '', role: 'user' };
    res.status(201).json({ token: makeToken(user), user: safeUser(user) });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Registration failed' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE email=? LIMIT 1', [email?.toLowerCase().trim()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password || '', user.password))) return res.status(401).json({ message: 'Invalid email or password' });
    res.json({ token: makeToken(user), user: safeUser(user) });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Login failed' }); }
});

router.get('/me', protect, async (req, res) => {
  const [addresses] = await pool.query('SELECT * FROM addresses WHERE user_id=? ORDER BY address_id DESC', [req.user.user_id]);
  res.json({ user: { ...safeUser(req.user), addresses } });
});

router.get('/users', protect, async (req,res) => {
  if (req.user.role !== 'admin') return res.status(403).json({message:'Admin access required'});
  const [rows] = await pool.query("SELECT user_id,name,email,phone,role,created_at FROM users WHERE role='user' ORDER BY created_at DESC");
  res.json(rows);
});

router.put('/profile', protect, async (req, res) => {
  const { name, phone, address, city, state, pincode } = req.body;
  await pool.query('UPDATE users SET name=?, phone=? WHERE user_id=?', [name || req.user.name, phone || '', req.user.user_id]);
  if (address && city && state && pincode) {
    const [existing] = await pool.query('SELECT address_id FROM addresses WHERE user_id=? ORDER BY address_id DESC LIMIT 1', [req.user.user_id]);
    if (existing.length) await pool.query('UPDATE addresses SET full_name=?,phone=?,address_line=?,city=?,state=?,pincode=? WHERE address_id=?', [name, phone, address, city, state, pincode, existing[0].address_id]);
    else await pool.query('INSERT INTO addresses(user_id,full_name,phone,address_line,city,state,pincode) VALUES(?,?,?,?,?,?,?)', [req.user.user_id,name,phone,address,city,state,pincode]);
  }
  const [rows] = await pool.query('SELECT user_id,name,email,phone,role FROM users WHERE user_id=?', [req.user.user_id]);
  res.json({ user: safeUser(rows[0]) });
});
export default router;
