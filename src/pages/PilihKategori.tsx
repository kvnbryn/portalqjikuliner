import { useNavigate } from "react-router-dom";
import { ChevronRight, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function PilihKategori() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const user = localStorage.getItem("tim_name");
    if (!user) {
      navigate("/");
    } else {
      setUserName(user);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("tim_name");
    localStorage.removeItem("participantFolderId");
    navigate("/");
  };

  const selectCategory = (category: string) => {
    navigate(`/dashboard?kategori=${category}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 text-text font-sans">
      <header className="bg-primary text-white pt-8 pb-16 px-6 rounded-b-[40px] shadow-soft relative overflow-hidden">
        <div className="absolute inset-0 w-full md:w-[60%] pointer-events-none">
          <div 
            className="absolute inset-0 opacity-10" 
            style={{ 
              backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px)', 
              backgroundSize: '40px 40px',
              maskImage: 'radial-gradient(ellipse at 20% 50%, black 10%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 20% 50%, black 10%, transparent 70%)'
            }} 
          />
          <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] bg-secondary/20 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-30%] left-[20%] w-[500px] h-[500px] bg-white/10 blur-[130px] rounded-full mix-blend-overlay" />
        </div>
        
        <div 
          className="absolute top-0 right-0 w-[100%] md:w-[70%] h-full pointer-events-none"
          style={{ 
            maskImage: 'linear-gradient(to right, transparent 0%, black 25%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 25%, black 100%)'
          }}
        >
          <img 
            src="/banner.webp" 
            alt="Banner" 
            className="absolute inset-0 w-full h-full object-cover opacity-90" 
            style={{ objectPosition: 'center 80%' }}
          />
          <div className="absolute inset-0 bg-primary-dark/40 mix-blend-overlay" />
        </div>
        
        <div className="absolute top-6 right-6 z-30">
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 text-sm font-bold text-red-100 hover:text-white transition-all bg-red-500/20 hover:bg-red-500/40 px-4 py-2 rounded-full border border-red-500/30 shadow-sm backdrop-blur-md"
          >
            <LogOut size={16} /> <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10 pt-4">
          
          <div>
            {/* Invisible placeholder for back button to keep exact height as DashboardTim */}
            <div className="opacity-0 pointer-events-none flex items-center gap-1 mb-2 text-sm font-medium">
               <ChevronRight className="rotate-180" size={16} /> Kembali
            </div>
            
            <p className="inline-block bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-white/90 font-bold tracking-widest uppercase text-xs mb-3 shadow-sm">Tim QJI 2026</p>
            <h1 className="font-extrabold text-4xl sm:text-5xl tracking-tight mb-8 text-white drop-shadow-lg" style={{ textShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>{userName}</h1>
            
            {/* Invisible placeholder for progress card to keep exact height as DashboardTim */}
            <div className="opacity-0 pointer-events-none bg-surface/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 w-full sm:w-[320px]">
              <div className="flex justify-between items-end mb-3">
                <p className="text-sm font-semibold">Progres Misi</p>
                <p className="text-2xl font-bold text-secondary">0%</p>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full w-0" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 -mt-6 relative z-20">
        <div className="space-y-4">
          
          {/* List Kategori QRIS */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            onClick={() => selectCategory("QRIS")}
            className="glass-panel min-h-[140px] p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row gap-5 items-end sm:items-center justify-end group transition-all duration-300 relative overflow-hidden cursor-pointer hover:border-primary/30 hover:shadow-soft"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl group-hover:bg-secondary/20 transition-all pointer-events-none" />
            
            {/* Banner Background */}
            <div 
              className="absolute inset-0 w-full sm:w-[70%] h-full pointer-events-none sm:[mask-image:linear-gradient(to_right,black_0%,black_70%,transparent_100%)] sm:[WebkitMaskImage:linear-gradient(to_right,black_0%,black_70%,transparent_100%)]"
            >
              <img 
                src="/bannerqris.webp" 
                alt="Banner QRIS" 
                className="absolute inset-0 w-full h-full object-cover object-center sm:object-left opacity-100 group-hover:scale-105 transition-transform duration-500" 
              />
              {/* Mobile overlay for better text contrast */}
              <div className="absolute inset-0 bg-black/20 sm:hidden mix-blend-overlay" />
              {/* Mobile overlay for better text contrast - removed to keep banner visible */}
            </div>
            
            <div className="w-full sm:w-auto relative z-10 mt-auto sm:mt-0 flex shrink-0">
              <button
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all bg-white/10 sm:bg-primary backdrop-blur-sm sm:backdrop-blur-none border border-white/20 sm:border-transparent text-white shadow-lg sm:shadow-soft group-hover:bg-white/20 sm:group-hover:bg-primary-dark group-hover:scale-105"
              >
                Pilih Kategori <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>

          {/* List Kategori PeKA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            onClick={() => selectCategory("PeKA")}
            className="glass-panel min-h-[140px] p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row gap-5 items-end sm:items-center justify-end group transition-all duration-300 relative overflow-hidden cursor-pointer hover:border-primary/30 hover:shadow-soft"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all pointer-events-none" />
            
            {/* Banner Background */}
            <div 
              className="absolute inset-0 w-full sm:w-[70%] h-full pointer-events-none sm:[mask-image:linear-gradient(to_right,black_0%,black_70%,transparent_100%)] sm:[WebkitMaskImage:linear-gradient(to_right,black_0%,black_70%,transparent_100%)]"
            >
              <img 
                src="/bannerpeka.webp" 
                alt="Banner PeKA" 
                className="absolute inset-0 w-full h-full object-cover object-center sm:object-left opacity-100 group-hover:scale-105 transition-transform duration-500" 
              />
              {/* Mobile overlay for better text contrast - removed to keep banner visible */}
            </div>
            
            <div className="w-full sm:w-auto relative z-10 mt-auto sm:mt-0 flex shrink-0">
              <button
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all bg-white/10 sm:bg-primary backdrop-blur-sm sm:backdrop-blur-none border border-white/20 sm:border-transparent text-white shadow-lg sm:shadow-soft group-hover:bg-white/20 sm:group-hover:bg-primary-dark group-hover:scale-105"
              >
                Pilih Kategori <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
