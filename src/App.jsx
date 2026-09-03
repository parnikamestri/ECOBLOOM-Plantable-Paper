import {useEffect,useState} from 'react';
import {Routes,Route,Navigate,useNavigate,useParams} from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import {About,How,Contact,Cart} from './pages/BasicPages';
import {Profile,Orders,Checkout} from './pages/Account';
import {api} from './api';
import {useAuth} from './context/AuthContext';
import {ArrowLeft,Heart,Minus,Plus,Upload,Leaf} from 'lucide-react';

function Private({children,admin=false}){
  const{user,loading}=useAuth();

  if(loading)return <main className="loading">Loading…</main>;
  if(!user)return <Navigate to="/login" replace/>;

  if(admin&&user.role!=='admin')
    return <Navigate to="/" replace/>;

  if(!admin&&user.role==='admin')
    return <Navigate to="/admin" replace/>;

  return children;
}

export default function App(){
  const{user}=useAuth();
  const[cart,setCart]=useState([]);
  const nav=useNavigate();

  const isAdmin=user?.role==='admin';

  // Login/Register pages should NOT show Navbar/Footer
  const currentPath=window.location.pathname;
  const isAuthPage=
    currentPath==='/login' ||
    currentPath==='/register';

  useEffect(()=>{
    if(user?.role==='user'){
      api('/cart')
        .then(d=>setCart(d.items||[]))
        .catch(()=>setCart([]));
    }else{
      setCart([]);
    }
  },[user]);

  const add=async(p,quantity=1)=>{
    if(!user){
      nav('/login',{
        state:{from:`/products/${p._id||p.id}`}
      });
      return;
    }

    if(user.role==='admin')return;

    try{
      const d=await api('/cart/add',{
        method:'POST',
        body:JSON.stringify({
          productId:p._id||p.id,
          quantity
        })
      });

      setCart(d.items||[]);
      return d;
    }catch(e){
      alert(e.message);
      throw e;
    }
  };

  const update=async(id,q)=>{
    try{
      const d=await api(`/cart/item/${id}`,{
        method:'PATCH',
        body:JSON.stringify({
          quantity:Math.max(0,q)
        })
      });

      setCart(d.items||[]);
    }catch(e){
      alert(e.message);
    }
  };

  const clear=()=>setCart([]);

  /*
   * Keep the existing behaviour:
   * If nobody is logged in and tries to open /
   * send them to login.
   */
  if(!user&&currentPath==='/')
    return <Navigate to="/login" replace/>;

  return (
    <>
      {/* Navbar hidden on Login/Register */}
      {!isAdmin&&!isAuthPage&&(
        <Navbar
          count={cart.reduce(
            (s,x)=>s+x.quantity,
            0
          )}
        />
      )}

      <Routes>

        {/* CUSTOMER HOME */}
        <Route
          path="/"
          element={
            <Private>
              <Home onAdd={add}/>
            </Private>
          }
        />

        {/* STORE FRONT FOR OWNER */}
        <Route
          path="/store"
          element={
            <Home onAdd={add}/>
          }
        />

        <Route
          path="/products"
          element={
            <Private>
              <Products onAdd={add}/>
            </Private>
          }
        />

        <Route
          path="/products/:id"
          element={
            <Private>
              <ProductPage onAdd={add}/>
            </Private>
          }
        />

        <Route
          path="/about"
          element={
            <Private>
              <About/>
            </Private>
          }
        />

        <Route
          path="/how-it-works"
          element={
            <Private>
              <How/>
            </Private>
          }
        />

        <Route
          path="/contact"
          element={
            <Private>
              <Contact/>
            </Private>
          }
        />

        {/* LOGIN */}
        <Route
          path="/login"
          element={
            user
              ? <Navigate
                  to={isAdmin?'/admin':'/'}
                  replace
                />
              : <Auth mode="login"/>
          }
        />

        {/* REGISTER */}
        <Route
          path="/register"
          element={
            user
              ? <Navigate
                  to={isAdmin?'/admin':'/'}
                  replace
                />
              : <Auth mode="register"/>
          }
        />

        <Route
          path="/profile"
          element={
            <Private>
              <Profile/>
            </Private>
          }
        />

        <Route
          path="/orders"
          element={
            <Private>
              <Orders/>
            </Private>
          }
        />

        <Route
          path="/cart"
          element={
            <Private>
              <Cart
                cart={cart}
                onUpdate={update}
                onCheckout={()=>nav('/checkout')}
              />
            </Private>
          }
        />

        <Route
          path="/checkout"
          element={
            <Private>
              <Checkout
                cart={cart}
                onPlaced={clear}
              />
            </Private>
          }
        />

        {/* OWNER / ADMIN */}
        <Route
          path="/admin"
          element={
            <Private admin>
              <Admin/>
            </Private>
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to={
                user?.role==='admin'
                  ? '/admin'
                  : user
                    ? '/'
                    : '/login'
              }
              replace
            />
          }
        />

      </Routes>

      {/* Footer hidden on Login/Register */}
      {!isAdmin&&!isAuthPage&&<Footer/>}
    </>
  );
}

function ProductPage({onAdd}){
  const{id}=useParams();
  const[p,setP]=useState(null);
  const[q,setQ]=useState(1);
  const[wish,setWish]=useState(false);

  const[form,setForm]=useState({
    requestTitle:'',
    customText:'',
    quantity:25,
    size:'',
    paperType:'',
    seedType:'',
    uploadedDesign:''
  });

  const[file,setFile]=useState(null);
  const[msg,setMsg]=useState('');

  const{user}=useAuth();
  const nav=useNavigate();

  useEffect(()=>{
    api('/products/'+id)
      .then(x=>{
        setP(x);

        setWish(
          JSON.parse(
            localStorage.getItem(
              'ecobloom_wishlist'
            )||'[]'
          ).includes(x._id)
        );
      })
      .catch(()=>{});
  },[id]);

  if(!p)
    return (
      <main className="page loading">
        Loading product…
      </main>
    );

  const addQty=async()=>{
    if(!user){
      nav('/login');
      return;
    }

    try{
      await onAdd?.(p,q);

      alert(
        `${q} item${q>1?'s':''} added to cart`
      );
    }catch(e){
      alert(e.message);
    }
  };

  const toggleWish=()=>{
    const list=JSON.parse(
      localStorage.getItem(
        'ecobloom_wishlist'
      )||'[]'
    );

    const next=wish
      ? list.filter(x=>x!==p._id)
      : [...list,p._id];

    localStorage.setItem(
      'ecobloom_wishlist',
      JSON.stringify(next)
    );

    setWish(!wish);
  };

  const submit=async e=>{
    e.preventDefault();

    if(!user){
      nav('/login');
      return;
    }

    try{
      let uploaded='';

      if(file){
        const fd=new FormData();

        fd.append('design',file);

        const up=await api(
          '/customizations/upload',
          {
            method:'POST',
            body:fd
          }
        );

        uploaded=up.path;
      }

      await api('/customizations',{
        method:'POST',
        body:JSON.stringify({
          ...form,
          productId:p._id,
          uploadedDesign:uploaded
        })
      });

      setMsg(
        'Request submitted — our team will review your requirements.'
      );

    }catch(e){
      setMsg(e.message);
    }
  };

  return (
    <main className="page productPage">

      <button
        className="back"
        onClick={()=>nav('/products')}
      >
        <ArrowLeft size={16}/>
        Back to shop
      </button>

      <div className="productDetail">

        <div className="detailVisual">

          <img
            src={p.image}
            alt={p.name}
          />

          <button
            className={`detailWish ${
              wish?'liked':''
            }`}
            onClick={toggleWish}
          >
            <Heart
              size={19}
              fill={
                wish
                  ? 'currentColor'
                  : 'none'
              }
            />

            {wish
              ? 'Saved'
              : 'Save to wishlist'}
          </button>

        </div>

        <div className="detailCopy">

          <span className="tag">
            {p.category}
          </span>

          <h1>{p.name}</h1>

          <div className="detailPrice">
            ₹{Number(p.price).toLocaleString()}
          </div>

          <p className="lead">
            {p.description ||
              'A thoughtfully made ECOBLOOM product designed to be enjoyed and planted.'}
          </p>

          <div className="specGrid">

            <div>
              <span>Seeds</span>
              <b>{p.seedType||'Mixed'}</b>
            </div>

            <div>
              <span>Paper</span>
              <b>{p.gsm||250} GSM</b>
            </div>

            <div>
              <span>Size</span>
              <b>{p.size||'Custom'}</b>
            </div>

            <div>
              <span>Stock</span>
              <b>
                {p.stock>0
                  ? `${p.stock} available`
                  : 'Out of stock'}
              </b>
            </div>

          </div>

          <div className="buyBox">

            <div className="qty">

              <button
                onClick={()=>
                  setQ(
                    Math.max(1,q-1)
                  )
                }
              >
                <Minus size={15}/>
              </button>

              <b>{q}</b>

              <button
                onClick={()=>
                  setQ(
                    Math.min(
                      p.stock,
                      q+1
                    )
                  )
                }
              >
                <Plus size={15}/>
              </button>

            </div>

            <button
              className="primary"
              disabled={!p.stock}
              onClick={addQty}
            >
              {p.stock
                ? 'Add to cart'
                : 'Out of stock'}
            </button>

          </div>

          <p className="plantNote">
            <Leaf size={16}/>
            Free delivery on orders ₹999+.
            Planting results depend on seed variety
            and growing conditions.
          </p>

        </div>
      </div>

      <section className="customSection">

        <div className="customIntro">

          <span className="eyebrow">
            PERSONALISE IT
          </span>

          <h2>Make it yours.</h2>

          <p>
            For weddings, gifting, events or brand
            stationery, tell us what you need.
            You can choose the paper, seeds,
            quantity and upload a reference.
          </p>

          <div className="customPerks">
            <span>✓ Artwork support</span>
            <span>✓ Bulk quantities</span>
            <span>✓ Seed choices</span>
          </div>

        </div>

        <form
          className="panel customBox"
          onSubmit={submit}
        >

          <input
            required
            placeholder="Request title"
            value={form.requestTitle}
            onChange={e=>
              setForm({
                ...form,
                requestTitle:e.target.value
              })
            }
          />

          <div className="formRow">

            <label>
              <span>Quantity</span>

              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={e=>
                  setForm({
                    ...form,
                    quantity:e.target.value
                  })
                }
              />
            </label>

            <label>
              <span>Size</span>

              <select
                value={form.size}
                onChange={e=>
                  setForm({
                    ...form,
                    size:e.target.value
                  })
                }
              >
                <option value="">
                  Choose size
                </option>
                <option>A6</option>
                <option>A5</option>
                <option>5 × 7 inch</option>
                <option>Custom</option>
              </select>
            </label>

          </div>

          <div className="formRow">

            <label>
              <span>Paper</span>

              <select
                value={form.paperType}
                onChange={e=>
                  setForm({
                    ...form,
                    paperType:e.target.value
                  })
                }
              >
                <option value="">
                  Choose paper
                </option>
                <option>Natural White</option>
                <option>Warm Ivory</option>
                <option>Pastel Green</option>
                <option>Pastel Pink</option>
                <option>Custom</option>
              </select>
            </label>

            <label>
              <span>Seeds</span>

              <select
                value={form.seedType}
                onChange={e=>
                  setForm({
                    ...form,
                    seedType:e.target.value
                  })
                }
              >
                <option value="">
                  Choose seeds
                </option>
                <option>Wildflower Mix</option>
                <option>Marigold</option>
                <option>Basil</option>
                <option>Herb Mix</option>
                <option>Custom</option>
              </select>
            </label>

          </div>

          <textarea
            rows="5"
            placeholder="Custom text, printing details or special instructions"
            value={form.customText}
            onChange={e=>
              setForm({
                ...form,
                customText:e.target.value
              })
            }
          />

          <label className="uploadBox">

            <Upload size={18}/>

            <span>
              <b>
                Upload artwork / reference
              </b>

              <small>
                Image or PDF · max 5 MB
              </small>
            </span>

            <input
              type="file"
              accept="image/*,.pdf"
              onChange={e=>
                setFile(
                  e.target.files?.[0]||null
                )
              }
            />

          </label>

          <button className="primary full">
            Send customization request
          </button>

          {msg&&(
            <div
              className={
                msg.includes('submitted')
                  ? 'success'
                  : 'error'
              }
            >
              {msg}
            </div>
          )}

        </form>

      </section>

    </main>
  );
}