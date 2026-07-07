import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, Filter, CalendarDays, Loader2, Users } from "lucide-react";
import toast from "react-hot-toast";
import { getPekaResponsesAPI } from "../lib/api";

export default function RespondenPeka() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [responses, setResponses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    const name = localStorage.getItem("tim_name");
    if (!name) {
      navigate("/");
    } else {
      setUserName(name);
      fetchData(name);
    }
  }, [navigate]);

  const fetchData = async (name: string) => {
    setIsFetching(true);
    try {
      const res = await getPekaResponsesAPI(name);
      if (res.status === "success" && Array.isArray(res.data)) {
        setResponses(res.data);
      } else {
        setResponses([]);
      }
    } catch (err) {
      toast.error("Gagal memuat daftar responden.");
    } finally {
      setIsFetching(false);
    }
  };

  // Filter and sort logic
  const filteredAndSortedResponses = useMemo(() => {
    let filtered = responses.filter((res) => {
      // Hanya tampilkan responden asli (yang mengisi form), abaikan foto dokumentasi lepas
      if (!res.responsesJSON || res.responsesJSON.length === 0) return false;
      const nama = (res.namaWarga || "").toLowerCase();
      return nama.includes(searchQuery.toLowerCase());
    });

    filtered.sort((a, b) => {
      // Assuming timestamp is in format DD/MM/YYYY HH:MM:SS or parsable Date string
      // Let's create a rough date parser if it's DD/MM/YYYY
      const parseDate = (dateStr: string) => {
        if (!dateStr) return 0;
        // Check if it matches DD/MM/YYYY
        if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
           const [datePart, timePart] = dateStr.split(" ");
           const [dd, mm, yyyy] = datePart.split("/");
           return new Date(`${yyyy}-${mm}-${dd}T${timePart || "00:00:00"}`).getTime();
        }
        return new Date(dateStr).getTime();
      };

      const timeA = parseDate(a.timestamp);
      const timeB = parseDate(b.timestamp);

      if (sortOrder === "newest") return timeB - timeA;
      return timeA - timeB;
    });

    return filtered;
  }, [responses, searchQuery, sortOrder]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-primary text-white pt-8 pb-10 px-6 rounded-b-[40px] shadow-soft relative overflow-hidden">
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
        </div>
        <div className="max-w-4xl mx-auto relative z-10 flex flex-col gap-6">
          <button onClick={() => navigate('/dashboard?kategori=PeKA')} className="self-start inline-flex bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white items-center gap-1.5 text-sm font-bold transition-all px-4 py-2 rounded-full shadow-sm">
             <ChevronLeft size={16} /> Kembali ke Dashboard
          </button>
          
          <div>
             <h1 className="font-black text-3xl sm:text-4xl tracking-tight mb-2 text-white">Daftar Responden</h1>
             <p className="text-white/80 font-medium text-sm sm:text-base max-w-lg">
                Seluruh warga yang telah mengisi kuesioner PeKA untuk tim <span className="font-bold text-white">{userName}</span>
             </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 -mt-4 relative z-20">
        
        {/* Toolbar (Search & Sort) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
           <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Search size={18} className="text-slate-400" />
              </div>
              <input
                 type="text"
                 placeholder="Cari nama responden..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm font-medium outline-none"
              />
           </div>
           
           <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="bg-slate-100 p-1.5 rounded-xl flex items-center w-full sm:w-auto">
                 <button 
                   onClick={() => setSortOrder("newest")}
                   className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${sortOrder === 'newest' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   <CalendarDays size={16} /> Terbaru
                 </button>
                 <button 
                   onClick={() => setSortOrder("oldest")}
                   className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${sortOrder === 'oldest' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   <Filter size={16} /> Terlama
                 </button>
              </div>
           </div>
        </div>

        {/* List Content */}
        {isFetching ? (
           <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm">
             <div className="w-16 h-16 mb-4 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
               <Loader2 size={28} className="text-primary animate-spin" />
             </div>
             <h3 className="text-lg font-bold text-slate-800">Memuat Data...</h3>
           </div>
        ) : filteredAndSortedResponses.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm">
             <div className="w-20 h-20 mb-5 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
               <Users size={32} className="text-slate-300" />
             </div>
             <h3 className="text-xl font-black text-slate-800 mb-2">Belum ada data responden</h3>
             <p className="text-slate-500 text-sm font-medium max-w-xs">
               {searchQuery ? "Coba ubah kata kunci pencarian Anda." : "Bagikan link kuesioner ke masyarakat untuk mendapatkan responden."}
             </p>
           </div>
        ) : (
           <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 border-b border-slate-100">
                   <tr>
                     <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-xs">No</th>
                     <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-xs">Nama Responden</th>
                     <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-xs text-right">Waktu Submit</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {filteredAndSortedResponses.map((res, idx) => {
                     const namaWarga = res.namaWarga || `Responden Tanpa Nama`;
                     return (
                       <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                         <td className="px-6 py-4 font-bold text-slate-300 group-hover:text-slate-400 w-12">{idx + 1}</td>
                         <td className="px-6 py-4 font-bold text-slate-800 text-base">{namaWarga}</td>
                         <td className="px-6 py-4 font-medium text-slate-500 text-right whitespace-nowrap">
                           <span className="bg-slate-100 px-3 py-1 rounded-lg text-xs tracking-wide">
                             {res.timestamp}
                           </span>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
             <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Menampilkan {filteredAndSortedResponses.length} responden
                </p>
             </div>
           </div>
        )}
      </main>
    </div>
  );
}
