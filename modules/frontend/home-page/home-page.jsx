import React, { useState, useEffect } from 'react';
import { 
  ShoppingBasket, 
  Clock, 
  Phone, 
  ChevronRight, 
  Plus, 
  Minus,
  Search,
  Menu as MenuIcon,
  X
} from 'lucide-react';

// --- คอมโพเนนต์หลัก ---
const App = () => {
  const [activeTab, setActiveTab] = useState('Burgery');
  const [cartCount, setCartCount] = useState(1);

  // ข้อมูลหมวดหมู่เมนู
  const categories = ['Startery', 'Burgery', 'Sałatki', 'Żeberka', 'Poutine'];
  const categoriesThai = {
    'Startery': 'อาหารทานเล่น',
    'Burgery': 'เบอร์เกอร์',
    'Sałatki': 'สลัด',
    'Żeberka': 'ซี่โครง',
    'Poutine': 'ปูติน'
  };

  // ข้อมูลสินค้าตัวอย่าง
  const burgers = Array(8).fill({
    id: 1,
    name: 'เบอร์เกอร์ ชาร์นูแชก',
    description: 'เนื้อวัว 200 กรัม, แตงกวาดอง, หอมแดง, สลัด, ซอสสูตรพิเศษ, ขนมปังเซซามิสีดำ',
    price: '26.90',
    image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=400&q=80'
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-red-600 overflow-x-hidden">
      
      {/* --- เอฟเฟกต์ละอองไฟพื้นหลัง --- */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-0 left-1/4 w-2 h-2 bg-orange-500 rounded-full blur-sm animate-pulse" style={{ animationDuration: '3s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-red-600 rounded-full blur-sm animate-ping" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-yellow-500 rounded-full blur-md animate-bounce" style={{ animationDuration: '5s' }}></div>
      </div>

      {/* --- ส่วนหัว (Navbar) --- */}
      <header className="relative z-50 flex items-center justify-between px-6 py-4 md:px-16 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 border-2 border-white rounded-full flex items-center justify-center font-bold text-xs">
            PP
          </div>
          <span className="font-black tracking-tighter text-xl">PITTU PITTU</span>
        </div>

        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium uppercase tracking-widest text-gray-400">
          <a href="#" className="text-white hover:text-red-500 transition-colors">หน้าแรก</a>
          <a href="#" className="hover:text-red-500 transition-colors">เมนู</a>
          <a href="#" className="hover:text-red-500 transition-colors">เกี่ยวกับเรา</a>
        </nav>

        <div className="flex items-center gap-6">
          <div className="hidden xl:flex flex-col items-end text-[10px] uppercase tracking-wider text-gray-500">
            <div className="flex items-center gap-2 text-red-500 font-bold">
              <ShoppingBasket size={14} /> 35.00 zł
            </div>
            <span>1 รายการ</span>
          </div>
          <div className="hidden xl:flex flex-col items-end text-[10px] uppercase tracking-wider text-gray-500 border-l border-white/10 pl-6">
            <div className="flex items-center gap-2 text-white font-bold">
              <Clock size={14} /> จันทร์ - ศุกร์
            </div>
            <span>12:00 - 23:00</span>
          </div>
          <div className="hidden xl:flex flex-col items-end text-[10px] uppercase tracking-wider text-gray-500 border-l border-white/10 pl-6">
            <div className="flex items-center gap-2 text-white font-bold">
              <Phone size={14} /> +48 123 456 789
            </div>
            <span className="text-red-500 cursor-pointer">ติดต่อเรา</span>
          </div>
          <button className="lg:hidden">
            <MenuIcon size={24} />
          </button>
        </div>
      </header>

      {/* --- ส่วน Hero --- */}
      <section className="relative min-h-[90vh] flex flex-col md:flex-row items-center justify-center px-6 md:px-16 pt-10 pb-20 overflow-hidden">
        {/* ของตกแต่งลอยไปมา */}
        <img 
          src="https://pngimg.com/uploads/tomato/tomato_PNG12589.png" 
          className="absolute top-20 left-10 w-24 opacity-80 blur-[2px] animate-float"
          alt="tomato decoration"
          style={{ animationDuration: '6s' }}
        />
        <img 
          src="https://pngimg.com/uploads/chili/chili_PNG1.png" 
          className="absolute bottom-20 left-1/4 w-32 rotate-45 opacity-90 animate-float-reverse"
          alt="chili decoration"
          style={{ animationDuration: '8s' }}
        />
        <img 
          src="https://pngimg.com/uploads/tomato/tomato_PNG12595.png" 
          className="absolute top-1/2 right-10 w-20 opacity-60 blur-sm animate-float"
          alt="tomato slice decoration"
        />

        <div className="w-full md:w-1/2 z-10">
          <h1 className="text-6xl md:text-8xl font-black mb-6 leading-none">
            เบอร์เกอร์<br />
            <span className="text-white">สปีออแชก</span>
          </h1>
          <p className="max-w-md text-gray-400 text-sm md:text-base leading-relaxed mb-10">
            เนื้อวัว 200 กรัม, แตงกวาดอง, กะหล่ำปลีแดง, สลัดหอมแดงทอด, เบคอน, ร็อกเก็ต, หัวหอมใหญ่, ซอสชีส, ขนมปังเซซามิสีดำ
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-bold flex items-center gap-3 transition-transform hover:scale-105 active:scale-95">
              <ShoppingBasket size={20} />
              ใส่ตะกร้า
            </button>
            <button className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-full font-bold flex items-center gap-3 border border-white/10 transition-transform hover:scale-105 active:scale-95">
              ดูเมนู
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="w-full md:w-1/2 relative mt-16 md:mt-0 flex justify-center">
          {/* ป้ายราคา */}
          <div className="absolute top-0 right-1/4 z-20 bg-red-600 p-4 rounded-xl shadow-2xl shadow-red-900/50 rotate-6 animate-pulse">
            <span className="block text-2xl font-black italic text-white">26.99 zł</span>
          </div>
          {/* ป้าย New */}
          <div className="absolute bottom-1/4 right-0 z-20 bg-yellow-500 text-black px-4 py-2 rounded-full font-black text-xs uppercase tracking-tighter shadow-lg">
            NEW
          </div>
          
          <div className="relative group">
            {/* วงรัศมีไฟข้างหลัง */}
            <div className="absolute inset-0 bg-orange-600/20 blur-[100px] rounded-full group-hover:bg-orange-600/30 transition-all"></div>
            <img 
              src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80" 
              alt="Main Burger"
              className="relative z-10 w-[400px] md:w-[600px] drop-shadow-[0_35px_35px_rgba(0,0,0,0.8)] rounded-3xl"
            />
          </div>
          
          {/* Pagination */}
          <div className="absolute -bottom-10 right-0 flex items-center gap-4 text-gray-500 font-mono">
            <div className="flex gap-2">
               <button className="hover:text-white transition-colors text-xl">←</button>
               <button className="hover:text-white transition-colors text-xl">→</button>
            </div>
            <span className="text-white font-black text-2xl">01</span>
            <span className="text-gray-700">/ 04</span>
          </div>
        </div>
      </section>

      {/* --- ส่วนเมนู (Menu Section) --- */}
      <section className="px-6 md:px-16 py-24 bg-[#080808]">
        <div className="flex flex-col items-center mb-16">
          <h2 className="text-5xl font-black uppercase tracking-tighter mb-10">เมนู</h2>
          <div className="flex flex-wrap justify-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  activeTab === cat 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' 
                  : 'text-gray-500 hover:text-white'
                }`}
              >
                {categoriesThai[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Grid ของเมนู */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {burgers.map((item, idx) => (
            <div key={idx} className="bg-[#121212] border border-white/5 rounded-3xl p-6 group hover:border-red-600/50 transition-all hover:-translate-y-2">
              <div className="relative mb-6">
                <span className="absolute top-0 left-0 text-gray-400 font-bold text-sm">26.90 zł</span>
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-48 object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-red-500 transition-colors">{item.name}</h3>
              <p className="text-xs text-gray-500 mb-6 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
                  <button className="p-1 hover:text-red-500"><Minus size={14} /></button>
                  <span className="px-3 text-sm font-bold">1</span>
                  <button className="p-1 hover:text-red-500"><Plus size={14} /></button>
                </div>
                <button className="bg-red-600 hover:bg-red-700 p-3 rounded-lg transition-colors">
                  <ShoppingBasket size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <button className="px-10 py-4 border border-white/10 rounded-full font-bold text-gray-400 hover:bg-white/5 transition-all">
            โหลดเพิ่มเติม
          </button>
        </div>
      </section>

      {/* --- ส่วนสลัด (Promo Section) --- */}
      <section className="relative px-6 md:px-16 py-32 bg-black overflow-hidden">
        {/* วงหอมใหญ่และพริกลอย */}
        <div className="absolute top-1/4 left-1/2 opacity-20 -rotate-12 animate-float">
           <svg width="100" height="100" viewBox="0 0 100 100" className="text-purple-400 stroke-current fill-none stroke-2">
             <circle cx="50" cy="50" r="40" />
             <circle cx="50" cy="50" r="30" />
           </svg>
        </div>
        
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="w-full md:w-1/2">
            <span className="text-red-500 font-bold uppercase tracking-widest text-sm mb-4 block">ลองเมนูใหม่ของเรา</span>
            <h2 className="text-6xl font-black mb-10 leading-tight">
              สลัดสุด<br /><span className="text-white">พรีเมียม</span>
            </h2>
            
            <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500">
                  <Plus size={24} />
                </div>
                <div>
                  <h4 className="font-bold">180g เนื้อเน้นๆ</h4>
                  <p className="text-xs text-gray-500">คัดสรรเนื้อคุณภาพดีที่สุด</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500">
                  <ShoppingBasket size={24} />
                </div>
                <div>
                  <h4 className="font-bold">วัตถุดิบสดใหม่</h4>
                  <p className="text-xs text-gray-500">ส่งตรงจากฟาร์มทุกวัน</p>
                </div>
              </div>
            </div>
            
            <button className="bg-red-600 px-8 py-4 rounded-full font-bold hover:scale-105 transition-transform">
              สั่งสลัดตอนนี้
            </button>
          </div>

          <div className="w-full md:w-1/2 relative flex justify-center">
            <div className="absolute inset-0 bg-red-600/10 blur-[120px] rounded-full"></div>
            <img 
              src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80" 
              alt="Fresh Salad"
              className="relative z-10 w-full max-w-md rounded-full shadow-[0_50px_100px_rgba(0,0,0,0.8)] border-8 border-white/5"
            />
            {/* พริกเขียวลอยประกอบ */}
            <div className="absolute -bottom-10 -left-10 w-32 h-32 animate-float-reverse opacity-80">
              <img src="https://pngimg.com/uploads/pepper/pepper_PNG2306.png" alt="pepper" className="w-full rotate-45" />
            </div>
          </div>
        </div>
      </section>

      {/* --- ส่วนท้าย (Footer) --- */}
      <footer className="bg-black py-16 border-t border-white/5">
        <div className="container mx-auto px-6 text-center">
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 border-2 border-white rounded-full flex items-center justify-center font-bold">
              PP
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            ร้านอาหารที่พร้อมเสิร์ฟความอร่อยด้วยวัตถุดิบคุณภาพพรีเมียม สัมผัสประสบการณ์เบอร์เกอร์ที่ไม่เหมือนใครได้ที่ PITTU PITTU
          </p>
          <div className="flex justify-center gap-6 text-gray-400">
             <a href="#" className="hover:text-white transition-colors">Facebook</a>
             <a href="#" className="hover:text-white transition-colors">Instagram</a>
             <a href="#" className="hover:text-white transition-colors">TikTok</a>
          </div>
          <div className="mt-10 pt-10 border-t border-white/5 text-[10px] uppercase tracking-widest text-gray-700">
            © 2024 PITTU PITTU. ออกแบบเพื่อความอร่อย
          </div>
        </div>
      </footer>

      {/* --- CSS Custom Animations --- */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes float-reverse {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(20px) rotate(-5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: float-reverse 7s ease-in-out infinite;
        }
      `}</style>

    </div>
  );
};

export default App;