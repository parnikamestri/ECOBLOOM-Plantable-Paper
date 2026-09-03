import express from 'express';
import { pool } from '../config/db.js';
import { protect, adminOnly } from '../middleware/auth.js';
const router=express.Router();
router.get('/', async (req,res)=>{const [rows]=await pool.query('SELECT category_id,category_name,description,created_at FROM categories ORDER BY category_name');res.json(rows);});
router.post('/',protect,adminOnly,async(req,res)=>{try{const name=String(req.body.name||'').trim();if(!name)return res.status(400).json({message:'Category name is required'});const [r]=await pool.query('INSERT INTO categories(category_name) VALUES(?)',[name]);res.status(201).json({category_id:r.insertId,category_name:name});}catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({message:'Category already exists'});res.status(500).json({message:'Could not add category'});}});
router.delete('/:id',protect,adminOnly,async(req,res)=>{const [used]=await pool.query('SELECT COUNT(*) AS n FROM products WHERE category_id=?',[req.params.id]);if(used[0].n>0)return res.status(409).json({message:'Category is used by products. Move products first.'});await pool.query('DELETE FROM categories WHERE category_id=?',[req.params.id]);res.json({message:'Category deleted'});});
export default router;
