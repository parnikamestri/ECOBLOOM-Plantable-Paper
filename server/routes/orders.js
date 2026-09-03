import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { pool } from '../config/db.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  : null;

router.post('/', protect, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { shippingAddress, paymentMethod = 'COD' } = req.body;
    if (!['COD', 'ONLINE'].includes(paymentMethod)) {
      await conn.rollback();
      return res.status(400).json({ message: 'Invalid payment method' });
    }
    if (paymentMethod === 'ONLINE' && !razorpay) {
      await conn.rollback();
      return res.status(503).json({ message: 'Online payment is not configured. Add Razorpay keys to server/.env.' });
    }

    const [cart] = await conn.query('SELECT c.cart_id FROM cart c WHERE c.user_id=?', [req.user.user_id]);
    if (!cart.length) { await conn.rollback(); return res.status(400).json({ message: 'Cart is empty' }); }

    const [items] = await conn.query(
      'SELECT ci.product_id,ci.quantity,p.product_name,p.price,p.image,p.stock FROM cart_items ci JOIN products p ON p.product_id=ci.product_id WHERE ci.cart_id=?',
      [cart[0].cart_id]
    );
    if (!items.length) { await conn.rollback(); return res.status(400).json({ message: 'Cart is empty' }); }

    let subtotal = 0;
    for (const i of items) {
      if (i.stock < i.quantity) {
        await conn.rollback();
        return res.status(400).json({ message: `Only ${i.stock} left for ${i.product_name}` });
      }
      subtotal += Number(i.price) * i.quantity;
    }

    let addressId = null;
    if (shippingAddress?.address) {
      const [a] = await conn.query(
        'INSERT INTO addresses(user_id,full_name,phone,address_line,city,state,pincode) VALUES(?,?,?,?,?,?,?)',
        [req.user.user_id, shippingAddress.name || req.user.name, shippingAddress.phone || '', shippingAddress.address, shippingAddress.city || '', shippingAddress.state || '', shippingAddress.pincode || '']
      );
      addressId = a.insertId;
    }

    const shipping = subtotal >= 999 ? 0 : 60;
    const total = subtotal + shipping;

    const [o] = await conn.query(
      'INSERT INTO orders(user_id,address_id,total_amount,payment_method,payment_status) VALUES(?,?,?,?,?)',
      [req.user.user_id, addressId, total, paymentMethod, 'PENDING']
    );

    for (const i of items) {
      await conn.query(
        'INSERT INTO order_items(order_id,product_id,product_name,price,quantity) VALUES(?,?,?,?,?)',
        [o.insertId, i.product_id, i.product_name, i.price, i.quantity]
      );
    }

    await conn.query(
      'INSERT INTO payments(order_id,payment_method,amount,payment_status) VALUES(?,?,?,?)',
      [o.insertId, paymentMethod, total, 'PENDING']
    );

    let razorpayOrder = null;
    if (paymentMethod === 'ONLINE') {
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(total * 100),
        currency: process.env.RAZORPAY_CURRENCY || 'INR',
        receipt: `ECOBLOOM-${o.insertId}`,
        notes: { local_order_id: String(o.insertId), user_id: String(req.user.user_id) }
      });
    } else {
      for (const i of items) {
        await conn.query('UPDATE products SET stock=stock-? WHERE product_id=? AND stock>=?', [i.quantity, i.product_id, i.quantity]);
      }
      await conn.query('DELETE FROM cart_items WHERE cart_id=?', [cart[0].cart_id]);
    }

    await conn.commit();

    res.status(201).json({
      orderId: o.insertId,
      total,
      paymentMethod,
      ...(razorpayOrder ? { razorpayOrderId: razorpayOrder.id, razorpayKeyId: process.env.RAZORPAY_KEY_ID, currency: razorpayOrder.currency } : {})
    });
  } catch (e) {
    await conn.rollback();
    console.error('ORDER CREATE ERROR:', e);
    res.status(500).json({ message: e.message || 'Could not place order' });
  } finally {
    conn.release();
  }
});

// Verify a real Razorpay payment. Signature verification is performed on the server.
router.patch('/:id/payment', protect, async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Payment verification details are missing' });
  }
  if (!razorpay) return res.status(503).json({ message: 'Online payment is not configured' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [orders] = await conn.query(
      'SELECT * FROM orders WHERE order_id=? AND user_id=? FOR UPDATE',
      [req.params.id, req.user.user_id]
    );
    if (!orders.length) { await conn.rollback(); return res.status(404).json({ message: 'Order not found' }); }
    const order = orders[0];

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (razorpay_order_id !== req.body.razorpay_order_id || expected !== razorpay_signature) {
      await conn.rollback();
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const [items] = await conn.query('SELECT product_id,quantity FROM order_items WHERE order_id=?', [order.order_id]);
    for (const i of items) {
      const [updated] = await conn.query(
        'UPDATE products SET stock=stock-? WHERE product_id=? AND stock>=?',
        [i.quantity, i.product_id, i.quantity]
      );
      if (updated.affectedRows !== 1) {
        await conn.rollback();
        return res.status(409).json({ message: 'One or more products are no longer available in the requested quantity.' });
      }
    }

    const [cart] = await conn.query('SELECT cart_id FROM cart WHERE user_id=?', [req.user.user_id]);
    if (cart.length) await conn.query('DELETE FROM cart_items WHERE cart_id=?', [cart[0].cart_id]);

    await conn.query("UPDATE orders SET payment_status='PAID' WHERE order_id=?", [order.order_id]);
    await conn.query(
      "UPDATE payments SET payment_status='SUCCESS',transaction_id=? WHERE order_id=?",
      [razorpay_payment_id, order.order_id]
    );

    await conn.commit();
    res.json({ message: 'Payment verified successfully', orderId: order.order_id, paymentStatus: 'PAID' });
  } catch (e) {
    await conn.rollback();
    console.error('PAYMENT VERIFY ERROR:', e);
    res.status(500).json({ message: e.message || 'Payment verification failed' });
  } finally {
    conn.release();
  }
});

async function orderRows(where = '', params = []) {
  const [orders] = await pool.query(
    `SELECT o.*,u.name AS user_name,u.email AS user_email,a.full_name,a.phone,a.address_line,a.city,a.state,a.pincode FROM orders o JOIN users u ON u.user_id=o.user_id LEFT JOIN addresses a ON a.address_id=o.address_id ${where} ORDER BY o.created_at DESC`,
    params
  );
  for (const o of orders) {
    const [items] = await pool.query(
      'SELECT order_item_id,product_id,product_name AS name,price,quantity FROM order_items WHERE order_id=?',
      [o.order_id]
    );
    o.items = items;
    o._id = String(o.order_id);
    o.total = Number(o.total_amount);
    o.orderStatus = o.order_status;
    o.paymentMethod = o.payment_method;
    o.paymentStatus = o.payment_status;
    o.createdAt = o.created_at;
    o.user = { name: o.user_name, email: o.user_email };
    o.shippingAddress = { name: o.full_name, phone: o.phone, address: o.address_line, city: o.city, state: o.state, pincode: o.pincode };
  }
  return orders;
}

router.get('/payments', protect, adminOnly, async (req,res)=>{const [rows]=await pool.query('SELECT p.*,o.user_id,u.name AS user_name,u.email AS user_email FROM payments p JOIN orders o ON o.order_id=p.order_id JOIN users u ON u.user_id=o.user_id ORDER BY p.payment_date DESC');res.json(rows);});
router.get('/mine', protect, async (req, res) => res.json(await orderRows('WHERE o.user_id=?', [req.user.user_id])));
router.get('/', protect, adminOnly, async (req, res) => res.json(await orderRows()));
router.patch('/:id/status', protect, adminOnly, async (req, res) => {
  const allowed = ['PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!allowed.includes(req.body.orderStatus)) return res.status(400).json({ message: 'Invalid order status' });
  await pool.query('UPDATE orders SET order_status=? WHERE order_id=?', [req.body.orderStatus, req.params.id]);
  res.json({ message: 'Order status updated' });
});

export default router;
