import {Link} from 'react-router-dom';
import {Heart,Plus,ArrowUpRight} from 'lucide-react';
import {useState} from 'react';
export default function ProductCard({product,onAdd}){
 const [wish,setWish]=useState(()=>JSON.parse(localStorage.getItem('ecobloom_wishlist')||'[]').includes(product._id||product.id));
 const toggle=e=>{e.preventDefault();const id=product._id||product.id;const list=JSON.parse(localStorage.getItem('ecobloom_wishlist')||'[]');const next=wish?list.filter(x=>x!==id):[...list,id];localStorage.setItem('ecobloom_wishlist',JSON.stringify(next));setWish(!wish)};
 return <article className="productCard"><div className="productImageWrap"><Link to={`/products/${product._id||product.id}`}><img src={product.image||'/images/placeholder.jpg'} alt={product.name}/></Link><button className={`wishBtn ${wish?'liked':''}`} onClick={toggle} aria-label="Wishlist"><Heart size={18} fill={wish?'currentColor':'none'}/></button>{product.featured&&<span className="featuredPill">Featured</span>}</div><div className="productInfo"><Link to={`/products/${product._id||product.id}`}><span className="tag">{product.category}</span><h3>{product.name}</h3></Link><div className="seed">Plantable • {product.seedType||'Mixed seeds'}</div><div className="priceRow"><strong>₹{Number(product.price).toLocaleString()}</strong><button onClick={()=>onAdd?.(product)}><Plus size={15}/> Add</button></div><Link className="quickView" to={`/products/${product._id||product.id}`}>View details <ArrowUpRight size={15}/></Link></div></article>
}
