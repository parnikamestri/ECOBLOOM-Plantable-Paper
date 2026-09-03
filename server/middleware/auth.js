import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

export async function protect(req, res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1] : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query('SELECT user_id, name, email, phone, role, created_at FROM users WHERE user_id=? LIMIT 1', [decoded.id]);
    if (!rows.length) return res.status(401).json({ message: 'User not found' });
    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
}
