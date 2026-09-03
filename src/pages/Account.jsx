import { useEffect,useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Package,
  MapPin,
  Clock3,
  ChevronRight,
  UserRound
} from 'lucide-react';

import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export function Profile(){

 const {user,setUser}=useAuth();

 const [f,setF]=useState({
   name:user?.name||'',
   phone:user?.phone||'',
   address:user?.address||'',
   city:'',
   state:'',
   pincode:''
 });

 const [msg,setMsg]=useState('');
 const [err,setErr]=useState('');

 const save=async e=>{
   e.preventDefault();

   setMsg('');
   setErr('');

   try{

     const d=await api(
       '/auth/profile',
       {
         method:'PUT',
         body:JSON.stringify(f)
       }
     );

     setUser(d.user);

     setMsg(
       'Profile updated successfully.'
     );

   }catch(e){
     setErr(e.message);
   }
 };

 return (
   <main className="page accountPage">

     <div className="accountHero">

       <div className="avatar">
         <UserRound/>
       </div>

       <div>

         <span className="eyebrow">
           MY ACCOUNT
         </span>

         <h1>
           Hello, {
             user?.name?.split(' ')[0]||'there'
           }.
         </h1>

         <p>{user?.email}</p>

       </div>

     </div>

     <div className="accountNav">

       <Link to="/orders">
         Orders
         <ChevronRight size={16}/>
       </Link>

       <Link to="/cart">
         Cart
         <ChevronRight size={16}/>
       </Link>

       <Link to="/products">
         Shop
         <ChevronRight size={16}/>
       </Link>

     </div>

     <div className="accountGrid">

       <form
         className="panel"
         onSubmit={save}
       >

         <div className="panelHeading">

           <div>

             <span className="eyebrow">
               PERSONAL DETAILS
             </span>

             <h2>
               Profile & delivery
             </h2>

           </div>

         </div>

         <input
           required
           value={f.name}
           onChange={e=>
             setF({
               ...f,
               name:e.target.value
             })
           }
           placeholder="Full name"
         />

         <input
           value={f.phone}
           onChange={e=>
             setF({
               ...f,
               phone:e.target.value
             })
           }
           placeholder="Phone number"
         />

         <textarea
           required
           value={f.address}
           onChange={e=>
             setF({
               ...f,
               address:e.target.value
             })
           }
           placeholder="Default shipping address"
           rows="5"
         />

         <div className="formRow">

           <input
             value={f.city}
             onChange={e=>
               setF({
                 ...f,
                 city:e.target.value
               })
             }
             placeholder="City"
           />

           <input
             value={f.state}
             onChange={e=>
               setF({
                 ...f,
                 state:e.target.value
               })
             }
             placeholder="State"
           />

         </div>

         <input
           value={f.pincode}
           onChange={e=>
             setF({
               ...f,
               pincode:e.target.value
             })
           }
           placeholder="Pincode"
         />

         <button className="primary">
           Save changes
         </button>

         {msg&&(
           <div className="success">
             {msg}
           </div>
         )}

         {err&&(
           <div className="error">
             {err}
           </div>
         )}

       </form>

       <div className="accountSide">

         <div className="panel">

           <span className="eyebrow">
             YOUR ECOBLOOM
           </span>

           <h2>
             Shop with purpose.
           </h2>

           <p>
             Every order helps turn an everyday
             paper moment into something that can grow.
           </p>

           <Link
             className="textLink"
             to="/how-it-works"
           >
             How it works
             <ChevronRight size={16}/>
           </Link>

         </div>

         <div className="panel">

           <h3>
             Need a custom product?
           </h3>

           <p>
             Send artwork, choose seeds, paper
             and quantity from any product page.
           </p>

           <Link
             className="primary full"
             to="/products"
           >
             Explore products
           </Link>

         </div>

       </div>

     </div>

   </main>
 );
}


/* =========================================================
   USER ORDERS
   ========================================================= */

export function Orders(){

 const [orders,setOrders]=useState([]);
 const [loading,setLoading]=useState(true);
 const [err,setErr]=useState('');

 useEffect(()=>{

   let mounted=true;

   const loadOrders=async()=>{

     try{

       const data=await api('/orders/mine');

       if(mounted){
         setOrders(data);
         setErr('');
       }

     }catch(e){

       if(mounted){
         setErr(e.message);
       }

     }finally{

       if(mounted){
         setLoading(false);
       }

     }

   };

   // Load immediately
   loadOrders();

   /*
    * IMPORTANT:
    * Owner changes order status from Admin dashboard.
    * User side checks server every 3 seconds.
    */
   const interval=setInterval(
     loadOrders,
     3000
   );

   /*
    * Also refresh when user comes back
    * to the Orders page/window.
    */
   window.addEventListener(
     'focus',
     loadOrders
   );

   return ()=>{

     mounted=false;

     clearInterval(interval);

     window.removeEventListener(
       'focus',
       loadOrders
     );

   };

 },[]);

 if(loading)
   return (
     <main className="page loading">
       Loading your orders…
     </main>
   );

 return (

   <main className="page ordersPage">

     <div className="ordersHead">

       <div>

         <span className="eyebrow">
           MY ACCOUNT
         </span>

         <h1>
           My Orders
         </h1>

         <p>
           Track your ECOBLOOM purchases
           and payment status.
         </p>

       </div>

       <Link
         className="primary"
         to="/products"
       >
         Continue shopping
       </Link>

     </div>

     {err&&(
       <div className="error">
         {err}
       </div>
     )}

     {!orders.length ? (

       <div className="empty">

         <div className="emptyIcon">
           📦
         </div>

         <h2>
           No orders yet
         </h2>

         <p>
           Your confirmed purchases will appear here.
         </p>

         <Link
           className="primary"
           to="/products"
         >
           Start shopping
         </Link>

       </div>

     ) : (

       <div className="orderList">

         {orders.map(o=>(
           <OrderCard
             key={o.order_id||o._id}
             order={o}
           />
         ))}

       </div>

     )}

   </main>
 );
}


/* =========================================================
   ORDER CARD
   ========================================================= */

function OrderCard({order:o}){

 const steps=[
   'PLACED',
   'PROCESSING',
   'SHIPPED',
   'DELIVERED'
 ];

 const current=
   steps.indexOf(o.orderStatus);

 const isCancelled=
   o.orderStatus==='CANCELLED';

 return (

   <article className="customerOrder">

     <div className="orderTop">

       <div>

         <span className="orderNumber">
           ORDER #{
             String(
               o.order_id||o._id
             ).padStart(4,'0')
           }
         </span>

         <h2>
           {o.items?.length||0}
           {' '}item(s) · ₹
           {Number(o.total).toFixed(2)}
         </h2>

         <p>
           {
             o.createdAt
               ? new Date(
                   o.createdAt
                 ).toLocaleString()
               : 'Recently placed'
           }
         </p>

       </div>

       <span
         className={
           `orderStatus ${
             o.orderStatus?.toLowerCase()
           }`
         }
       >
         {o.orderStatus}
       </span>

     </div>


     <div className="orderItems">

       {(o.items||[]).map(i=>(

         <div
           key={
             i.order_item_id||
             i.product_id
           }
         >

           <span>
             {i.name}
           </span>

           <b>
             × {i.quantity}
           </b>

           <strong>
             ₹{
               (
                 Number(i.price)*
                 Number(i.quantity)
               ).toFixed(2)
             }
           </strong>

         </div>

       ))}

     </div>


     <div className="tracking">

       <div className="trackingLine">

         {steps.map((s,i)=>(

           <div
             className={
               i<=current &&
               !isCancelled
                 ? 'done'
                 : ''
             }
             key={s}
           >

             <span>

               {i<=current &&
               !isCancelled ? (

                 <CheckCircle2
                   size={17}
                 />

               ) : (

                 <span className="dot"/>

               )}

             </span>

             <small>
               {s}
             </small>

           </div>

         ))}

       </div>

     </div>


     <div className="orderMeta">

       <span>

         <Package size={16}/>

         Payment:

         {' '}

         <b>
           {o.paymentStatus}
         </b>

       </span>


       <span>

         <MapPin size={16}/>

         {
           o.shippingAddress?.city||
           'Delivery address saved'
         }

       </span>


       {isCancelled&&(

         <span>

           <Clock3 size={16}/>

           Order cancelled

         </span>

       )}

     </div>

   </article>

 );
}


/* =========================================================
   RAZORPAY
   ========================================================= */

function loadRazorpay(){

 return new Promise(
   (resolve,reject)=>{

     if(window.Razorpay)
       return resolve(true);

     const s=
       document.createElement('script');

     s.src=
       'https://checkout.razorpay.com/v1/checkout.js';

     s.onload=()=>resolve(true);

     s.onerror=()=>reject(
       new Error(
         'Could not load payment gateway. Check your internet connection.'
       )
     );

     document.body.appendChild(s);

   }
 );
}


/* =========================================================
   CHECKOUT
   ========================================================= */

export function Checkout({
  cart,
  onPlaced
}){

 const{user}=useAuth();
 const nav=useNavigate();

 const[form,setForm]=useState({
   name:user?.name||'',
   phone:user?.phone||'',
   address:'',
   city:'',
   state:'',
   pincode:''
 });

 const[payment,setPayment]=useState('COD');
 const[err,setErr]=useState('');
 const[placing,setPlacing]=useState(false);

 const total=cart.reduce(
   (s,x)=>
     s+
     Number(x.price||0)*
     Number(x.quantity||0),
   0
 );

 const shipping=
   total>=999
     ? 0
     : 60;

 const grand=
   total+shipping;


 const place=async e=>{

   e.preventDefault();

   setErr('');
   setPlacing(true);

   try{

     const o=await api(
       '/orders',
       {
         method:'POST',
         body:JSON.stringify({
           shippingAddress:form,
           paymentMethod:payment
         })
       }
     );


     /* COD */
     if(payment==='COD'){

       onPlaced();

       nav('/orders');

       return;
     }


     /* ONLINE PAYMENT */

     await loadRazorpay();

     await new Promise(
       (resolve,reject)=>{

         const rzp=
           new window.Razorpay({

             key:o.razorpayKeyId,

             amount:
               Math.round(
                 Number(o.total)*100
               ),

             currency:
               o.currency||'INR',

             name:'ECOBLOOM',

             description:
               'Plantable paper products',

             order_id:
               o.razorpayOrderId,

             prefill:{
               name:form.name,
               email:user?.email||'',
               contact:form.phone||''
             },

             notes:{
               local_order_id:
                 String(o.orderId)
             },

             theme:{
               color:'#285c42'
             },

             handler:async response=>{

               try{

                 await api(
                   `/orders/${o.orderId}/payment`,
                   {
                     method:'PATCH',
                     body:
                       JSON.stringify(
                         response
                       )
                   }
                 );

                 onPlaced();

                 nav('/orders');

                 resolve();

               }catch(error){

                 reject(error);

               }

             },

             modal:{
               ondismiss:()=>reject(
                 new Error(
                   'Payment was cancelled. Your order remains pending.'
                 )
               )
             }

           });


         rzp.on(
           'payment.failed',
           response=>
             reject(
               new Error(
                 response.error?.description||
                 'Payment failed.'
               )
             )
         );

         rzp.open();

       }
     );

   }catch(e){

     setErr(
       e.message||
       'Could not place order.'
     );

   }finally{

     setPlacing(false);

   }

 };


 if(!cart.length)

   return (

     <main className="page empty">

       <h1>
         Your cart is empty
       </h1>

       <Link
         className="primary"
         to="/products"
       >
         Shop now
       </Link>

     </main>

   );


 return (

   <main className="page checkoutPage">

     <div className="checkoutHead">

       <span className="eyebrow">
         SECURE CHECKOUT
       </span>

       <h1>
         Complete your order
       </h1>

       <p>
         Almost there. Add delivery details
         and choose how you'd like to pay.
       </p>

     </div>


     <div className="checkoutGrid">

       <form
         className="panel"
         onSubmit={place}
       >

         <div className="stepTitle">

           <b>01</b>

           <div>

             <h2>
               Delivery details
             </h2>

             <span>
               Where should we send your order?
             </span>

           </div>

         </div>


         <input
           required
           value={form.name}
           onChange={e=>
             setForm({
               ...form,
               name:e.target.value
             })
           }
           placeholder="Full name"
         />


         <input
           required
           value={form.phone}
           onChange={e=>
             setForm({
               ...form,
               phone:e.target.value
             })
           }
           placeholder="Phone number"
         />


         <textarea
           required
           value={form.address}
           onChange={e=>
             setForm({
               ...form,
               address:e.target.value
             })
           }
           rows="5"
           placeholder="Full delivery address"
         />


         <div className="formRow">

           <input
             required
             value={form.city}
             onChange={e=>
               setForm({
                 ...form,
                 city:e.target.value
               })
             }
             placeholder="City"
           />

           <input
             required
             value={form.state}
             onChange={e=>
               setForm({
                 ...form,
                 state:e.target.value
               })
             }
             placeholder="State"
           />

         </div>


         <input
           required
           value={form.pincode}
           onChange={e=>
             setForm({
               ...form,
               pincode:e.target.value
             })
           }
           placeholder="Pincode"
         />


         <div className="stepTitle paymentTitle">

           <b>02</b>

           <div>

             <h2>
               Payment
             </h2>

             <span>
               Choose your preferred method.
             </span>

           </div>

         </div>


         <label
           className={
             `payOption ${
               payment==='COD'
                 ? 'selected'
                 : ''
             }`
           }
         >

           <input
             type="radio"
             checked={payment==='COD'}
             onChange={()=>
               setPayment('COD')
             }
           />

           <span>

             <b>
               Cash on Delivery
             </b>

             <small>
               Pay when your package arrives
             </small>

           </span>

           <strong>
             ₹{grand.toFixed(2)}
           </strong>

         </label>


         <label
           className={
             `payOption ${
               payment==='ONLINE'
                 ? 'selected'
                 : ''
             }`
           }
         >

           <input
             type="radio"
             checked={payment==='ONLINE'}
             onChange={()=>
               setPayment('ONLINE')
             }
           />

           <span>

             <b>
               Online Payment
             </b>

             <small>
               UPI, cards and netbanking when configured
             </small>

           </span>

           <strong>
             Secure
           </strong>

         </label>


         {err&&(
           <div className="error">
             {err}
           </div>
         )}


         <button
           className="primary full"
           disabled={placing}
         >

           {placing
             ? 'Processing…'
             : payment==='ONLINE'
               ? 'Continue to secure payment'
               : 'Place order'
           }

         </button>

       </form>


       <aside className="summary checkoutSummary">

         <span className="eyebrow">
           ORDER SUMMARY
         </span>

         <h2>
           {cart.length} product{
             cart.length>1?'s':''
           }
         </h2>


         {cart.map(x=>(

           <div
             className="mini"
             key={x._id}
           >

             <span>

               {x.name}

               <b>
                 × {x.quantity}
               </b>

             </span>

             <strong>
               ₹{
                 (
                   Number(x.price)*
                   Number(x.quantity)
                 ).toFixed(2)
               }
             </strong>

           </div>

         ))}


         <hr/>


         <div>
           <span>Subtotal</span>
           <b>
             ₹{total.toFixed(2)}
           </b>
         </div>


         <div>
           <span>Delivery</span>

           <b>
             {
               shipping
                 ? `₹${shipping}`
                 : 'Free'
             }
           </b>

         </div>


         <div className="grand">

           <span>
             Total
           </span>

           <b>
             ₹{grand.toFixed(2)}
           </b>

         </div>


         <p className="secureNote">
           🔒 Your order details are sent
           securely to the ECOBLOOM server.
         </p>

       </aside>

     </div>

   </main>
 );
}