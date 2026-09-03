import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool, connectDB } from './config/db.js';
const products=[
['Wildflower Seed Paper Card','Greeting Cards',149,'Handmade plantable card embedded with flower seeds.','https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=900&q=80','Wildflower',30,250],
['Plantable Thank You Card','Greeting Cards',99,'Eco-friendly thank-you card that can be planted after use.','https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80','Mixed flowers',40,220],
['Seed Paper Gift Tags','Gift Tags',199,'A set of plantable gift tags for thoughtful packaging.','https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80','Basil & flowers',25,250],
['Bloom Wedding Invitation','Wedding Invitations',399,'Elegant plantable invitation for eco-conscious celebrations.','https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80','Marigold',20,300],
['Grow Me Bookmark','Bookmarks',129,'A plantable bookmark with a second life in soil.','https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=80','Herbs',50,250],
['Mini Bloom Gift Kit','Gift Kits',549,'A compact gifting set made for birthdays and celebrations.','https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80','Mixed flowers',15,300]
];
await connectDB();
for(const [name,cat,price,description,image,seed,stock,gsm] of products){let [c]=await pool.query('SELECT category_id FROM categories WHERE category_name=?',[cat]);let cid=c[0]?.category_id;if(!cid){const [r]=await pool.query('INSERT INTO categories(category_name) VALUES(?)',[cat]);cid=r.insertId;}const [p]=await pool.query('SELECT product_id FROM products WHERE product_name=?',[name]);if(!p.length)await pool.query('INSERT INTO products(category_id,product_name,description,price,stock,gsm,seed_type,image) VALUES(?,?,?,?,?,?,?,?)',[cid,name,description,price,stock,gsm,seed,image]);}
const email='admin@ecobloom.local';const [u]=await pool.query('SELECT user_id FROM users WHERE email=?',[email]);if(!u.length){const hash=await bcrypt.hash('Admin@123',10);await pool.query('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)',['ECOBLOOM Admin',email,hash,'admin']);}
console.log('Seed complete');await pool.end();
